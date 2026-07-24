import Groq from "groq-sdk";

let _groq: Groq | null = null;

function getGroq(): Groq {
  if (_groq) return _groq;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");
  _groq = new Groq({ apiKey });
  return _groq;
}

// ─── Types ────────────────────────────────────────────────────────────
export interface AnalysisResult {
  sentiment_label: string;
  sentiment_score: number;
  bias_label: string;
  bias_score: number;
  summary: string;
  strategic_score: number;
  risk_level: string;
  key_drivers: string[];
  affected_regions: string[];
}

export interface EntityResult {
  entities: { name: string; type: string; description: string | null }[];
  relations: {
    from: string;
    relation: string;
    to: string;
    confidence: number;
  }[];
}

// ─── Helper: call Groq and parse JSON ─────────────────────────────────
async function chatJson(
  system: string,
  user: string,
  maxTokens = 500,
  retries = 3
): Promise<Record<string, unknown>> {
  const groq = getGroq();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: maxTokens,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = resp.choices[0]?.message?.content;
      if (!content) return {};
      return JSON.parse(content);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      // Retry on rate limit
      if (errMsg.includes("429") && attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
        continue;
      }
      console.error(`[groq] call failed attempt=${attempt}`, errMsg);
      return {};
    }
  }
  return {};
}

// ─── Sentiment ────────────────────────────────────────────────────────
async function analyzeSentiment(
  text: string
): Promise<{ sentiment_label: string; sentiment_score: number }> {
  const res = await chatJson(
    `You are an expert financial and geopolitical analyst. Analyze the sentiment of the provided article.
You must respond ONLY with a JSON object containing the keys:
- 'sentiment_label': one of 'positive', 'neutral', 'negative'
- 'sentiment_score': a float from -1.0 (extremely negative) to 1.0 (extremely positive)`,
    text,
    200
  );
  return {
    sentiment_label: (res.sentiment_label as string) || "neutral",
    sentiment_score: Number(res.sentiment_score) || 0,
  };
}

// ─── Bias ─────────────────────────────────────────────────────────────
async function analyzeBias(
  text: string
): Promise<{ bias_label: string; bias_score: number }> {
  const res = await chatJson(
    `You are an expert media analyst. Analyze the political and editorial bias of the provided article.
You must respond ONLY with a JSON object containing the keys:
- 'bias_label': one of 'left', 'left-center', 'center', 'right-center', 'right'
- 'bias_score': a float from -1.0 (extreme left bias) to 1.0 (extreme right bias), with 0.0 representing center`,
    text,
    200
  );
  return {
    bias_label: (res.bias_label as string) || "center",
    bias_score: Number(res.bias_score) || 0,
  };
}

// ─── Summary ──────────────────────────────────────────────────────────
async function analyzeSummary(text: string): Promise<{ summary: string }> {
  const res = await chatJson(
    `You are an expert editor. Provide a concise summary of the geopolitical event described in the article.
You must respond ONLY with a JSON object containing the key:
- 'summary': a brief, high-quality summary (2-3 sentences max)`,
    text,
    300
  );
  return { summary: (res.summary as string) || "" };
}

// ─── Strategic Scoring ────────────────────────────────────────────────
async function analyzeStrategicScore(
  summary: string,
  sentimentLabel: string,
  textContent: string
): Promise<{
  strategic_score: number;
  risk_level: string;
  key_drivers: string[];
  affected_regions: string[];
}> {
  const res = await chatJson(
    `You are a strategic intelligence analyst. Rate the geopolitical importance and strategic risk of the event.
You must respond ONLY with a JSON object containing the keys:
- 'strategic_score': an integer from 0 (completely irrelevant/noise) to 100 (critical global impact / outbreak of war)
- 'risk_level': one of 'Low', 'Medium', 'High', 'Critical'
- 'key_drivers': a list of strings representing the main geopolitical drivers/motives involved
- 'affected_regions': a list of strings representing the regions or countries affected by this event`,
    `Summary: ${summary}\nSentiment: ${sentimentLabel}\nFull text: ${textContent.slice(0, 2000)}`,
    300
  );
  return {
    strategic_score: Number(res.strategic_score) || 50,
    risk_level: (res.risk_level as string) || "Medium",
    key_drivers: Array.isArray(res.key_drivers)
      ? (res.key_drivers as string[])
      : [],
    affected_regions: Array.isArray(res.affected_regions)
      ? (res.affected_regions as string[])
      : [],
  };
}

// ─── Full Article Analysis (parallel) ─────────────────────────────────
export async function analyzeArticle(
  title: string,
  content: string
): Promise<AnalysisResult> {
  const textToAnalyze = `Title: ${title}\n\nContent: ${content}`;

  // Run sentiment, bias, summary in parallel
  const [sentimentRes, biasRes, summaryRes] = await Promise.all([
    analyzeSentiment(textToAnalyze),
    analyzeBias(textToAnalyze),
    analyzeSummary(textToAnalyze),
  ]);

  // Strategic scoring needs the summary result
  const strategicRes = await analyzeStrategicScore(
    summaryRes.summary,
    sentimentRes.sentiment_label,
    textToAnalyze
  );

  return {
    sentiment_label: sentimentRes.sentiment_label,
    sentiment_score: sentimentRes.sentiment_score,
    bias_label: biasRes.bias_label,
    bias_score: biasRes.bias_score,
    summary: summaryRes.summary,
    strategic_score: strategicRes.strategic_score,
    risk_level: strategicRes.risk_level,
    key_drivers: strategicRes.key_drivers,
    affected_regions: strategicRes.affected_regions,
  };
}

// ─── Entity Extraction ────────────────────────────────────────────────
export async function extractEntities(
  articleText: string
): Promise<EntityResult> {
  const systemPrompt = `Extract entities and relationships from the provided news article text.

Rules:
- Only extract entities that are explicitly named in the article
- Only extract relationships that are directly stated, not implied
- Types: Person | Country | Organization | Treaty | Agreement | Concept
- Relation types: leads|member_of|opposes|supports|sanctions|alliance_with|conflict_with|negotiates_with|signed|owns|located_in|accused_of

Respond ONLY with this JSON structure (no markdown, no extra text):
{
  "entities": [
    {"name": "string", "type": "string", "description": "string"}
  ],
  "relations": [
    {"from": "entity_name", "relation": "relation_type", "to": "entity_name", "confidence": 0.0}
  ]
}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await chatJson(
      systemPrompt,
      `Article Content:\n${articleText.slice(0, 4000)}`,
      1000
    );

    if (
      result &&
      Array.isArray(result.entities) &&
      Array.isArray(result.relations)
    ) {
      return result as unknown as EntityResult;
    }
  }

  return { entities: [], relations: [] };
}
