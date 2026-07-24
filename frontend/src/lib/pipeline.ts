/**
 * Ingestion Pipeline — orchestrates fetch → deduplicate → insert → AI analysis → entities.
 * Runs entirely server-side via Next.js API routes.
 */
import { getSupabaseAdmin } from "./supabase-server";
import {
  fetchAllSources,
  type SourceFetchResult,
} from "./news-fetchers";
import { analyzeArticle, extractEntities } from "./groq";
import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────
export interface PipelineEvent {
  type:
    | "status"
    | "source_start"
    | "source_done"
    | "article_processing"
    | "article_done"
    | "article_error"
    | "complete"
    | "error";
  message: string;
  data?: Record<string, unknown>;
}

export interface PipelineStats {
  sources: Record<
    string,
    { fetched: number; inserted: number; duplicates: number; errors: number }
  >;
  total_fetched: number;
  total_inserted: number;
  total_duplicates: number;
  total_errors: number;
  total_analyzed: number;
  duration_seconds: number;
}

// ─── Hash (matches backend SHA-256 logic exactly) ─────────────────────
function computeHash(title: string, url: string): string {
  const content = `${title.trim().toLowerCase()}|${url.trim().toLowerCase()}`;
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex").slice(0, 64);
}

// ─── Pipeline ─────────────────────────────────────────────────────────
export async function* runIngestionPipeline(): AsyncGenerator<PipelineEvent> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();

  const stats: PipelineStats = {
    sources: {},
    total_fetched: 0,
    total_inserted: 0,
    total_duplicates: 0,
    total_errors: 0,
    total_analyzed: 0,
    duration_seconds: 0,
  };

  // Phase 1: Fetch from all sources
  yield { type: "status", message: "Fetching news from all sources..." };

  let sourceResults: SourceFetchResult[];
  try {
    sourceResults = await fetchAllSources();
  } catch (e) {
    yield {
      type: "error",
      message: `Failed to fetch sources: ${e instanceof Error ? e.message : String(e)}`,
    };
    return;
  }

  // Phase 2: Process each source
  for (const sourceResult of sourceResults) {
    const { source, articles, error } = sourceResult;
    const sourceStats = {
      fetched: articles.length,
      inserted: 0,
      duplicates: 0,
      errors: 0,
    };
    stats.sources[source] = sourceStats;
    stats.total_fetched += articles.length;

    if (error) {
      yield {
        type: "source_done",
        message: `${source}: error — ${error}`,
        data: { source, error },
      };
      continue;
    }

    yield {
      type: "source_start",
      message: `Processing ${articles.length} articles from ${source}...`,
      data: { source, count: articles.length },
    };

    // Process articles from this source
    for (const raw of articles) {
      const hashId = computeHash(raw.title, raw.url);

      // Dedup check against Supabase
      const { data: existing } = await supabase
        .from("articles")
        .select("id")
        .eq("hash_id", hashId)
        .limit(1)
        .single();

      if (existing) {
        sourceStats.duplicates++;
        stats.total_duplicates++;
        continue;
      }

      // Resolve or create source
      let sourceId: string | null = null;
      {
        const { data: srcRow } = await supabase
          .from("sources")
          .select("id")
          .ilike("name", raw.source_name)
          .limit(1)
          .single();

        if (srcRow) {
          sourceId = srcRow.id;
        } else {
          const { data: newSrc } = await supabase
            .from("sources")
            .insert({
              name: raw.source_name,
              credibility_score: 0.7,
              is_active: true,
            })
            .select("id")
            .single();
          sourceId = newSrc?.id || null;
        }
      }

      // Insert article
      const { data: article, error: insertErr } = await supabase
        .from("articles")
        .insert({
          title: raw.title,
          url: raw.url,
          content_raw: raw.content,
          source_id: sourceId,
          published_at: raw.published_at || new Date().toISOString(),
          language: raw.language,
          hash_id: hashId,
          is_processed: false,
        })
        .select("id, title")
        .single();

      if (insertErr || !article) {
        sourceStats.errors++;
        stats.total_errors++;
        continue;
      }

      sourceStats.inserted++;
      stats.total_inserted++;

      yield {
        type: "article_processing",
        message: `Analyzing: ${raw.title.slice(0, 60)}...`,
        data: { article_id: article.id, source },
      };

      // Phase 3: AI Analysis (Groq)
      try {
        const analysis = await analyzeArticle(
          raw.title,
          raw.content || raw.title
        );

        // Save analysis to article_analysis table
        await supabase.from("article_analysis").insert({
          article_id: article.id,
          sentiment_label: analysis.sentiment_label,
          sentiment_score: analysis.sentiment_score,
          bias_label: analysis.bias_label,
          bias_score: analysis.bias_score,
          summary: analysis.summary,
          strategic_score: analysis.strategic_score,
          risk_level: analysis.risk_level,
          key_drivers: analysis.key_drivers,
          affected_regions: analysis.affected_regions,
        });

        // Mark article as processed
        await supabase
          .from("articles")
          .update({ is_processed: true })
          .eq("id", article.id);

        // Phase 4: Entity Extraction
        const entityResult = await extractEntities(
          raw.content || raw.title
        );

        if (entityResult.entities.length > 0) {
          const entityIdMap: Record<string, string> = {};

          for (const ent of entityResult.entities) {
            // Upsert entity
            const { data: existingEnt } = await supabase
              .from("entities")
              .select("id, mention_count")
              .eq("name", ent.name)
              .eq("type", ent.type)
              .limit(1)
              .single();

            if (existingEnt) {
              await supabase
                .from("entities")
                .update({
                  mention_count: (existingEnt.mention_count || 0) + 1,
                  last_seen: new Date().toISOString(),
                  description: ent.description || undefined,
                })
                .eq("id", existingEnt.id);
              entityIdMap[ent.name] = existingEnt.id;
            } else {
              const { data: newEnt } = await supabase
                .from("entities")
                .insert({
                  name: ent.name,
                  type: ent.type,
                  description: ent.description,
                  mention_count: 1,
                  last_seen: new Date().toISOString(),
                })
                .select("id")
                .single();
              if (newEnt) entityIdMap[ent.name] = newEnt.id;
            }
          }

          // Upsert relations
          for (const rel of entityResult.relations) {
            const fromId = entityIdMap[rel.from];
            const toId = entityIdMap[rel.to];
            if (!fromId || !toId) continue;

            const { data: existingRel } = await supabase
              .from("entity_relations")
              .select("id, evidence_count, confidence, source_article_ids")
              .eq("from_entity_id", fromId)
              .eq("to_entity_id", toId)
              .eq("relation_type", rel.relation)
              .limit(1)
              .single();

            if (existingRel) {
              const newCount = (existingRel.evidence_count || 0) + 1;
              const newConf =
                ((existingRel.confidence || 0) *
                  (existingRel.evidence_count || 0) +
                  rel.confidence) /
                newCount;
              const articleIds = [
                ...((existingRel.source_article_ids as string[]) || []),
                article.id,
              ];
              await supabase
                .from("entity_relations")
                .update({
                  evidence_count: newCount,
                  confidence: newConf,
                  source_article_ids: articleIds,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingRel.id);
            } else {
              await supabase.from("entity_relations").insert({
                from_entity_id: fromId,
                to_entity_id: toId,
                relation_type: rel.relation,
                confidence: rel.confidence,
                evidence_count: 1,
                source_article_ids: [article.id],
              });
            }
          }
        }

        stats.total_analyzed++;
        yield {
          type: "article_done",
          message: `✓ ${raw.title.slice(0, 50)}... → ${analysis.risk_level} risk`,
          data: {
            article_id: article.id,
            risk_level: analysis.risk_level,
            source,
          },
        };
      } catch (aiErr) {
        sourceStats.errors++;
        stats.total_errors++;
        yield {
          type: "article_error",
          message: `✗ AI analysis failed for: ${raw.title.slice(0, 50)}...`,
          data: {
            article_id: article.id,
            error:
              aiErr instanceof Error ? aiErr.message : String(aiErr),
          },
        };
      }
    }

    yield {
      type: "source_done",
      message: `${source}: ${sourceStats.inserted} new, ${sourceStats.duplicates} duplicates, ${sourceStats.errors} errors`,
      data: { source, stats: sourceStats },
    };
  }

  // Final
  stats.duration_seconds = (Date.now() - startTime) / 1000;

  yield {
    type: "complete",
    message: `Pipeline complete — ${stats.total_inserted} articles ingested in ${stats.duration_seconds.toFixed(1)}s`,
    data: { stats },
  };
}
