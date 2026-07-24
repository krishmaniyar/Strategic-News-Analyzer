/**
 * News source fetchers — TypeScript ports of the 5 backend Python adapters.
 * All fetchers run server-side only (from API routes).
 */

// ─── Types ────────────────────────────────────────────────────────────
export interface RawArticle {
  title: string;
  url: string;
  source_name: string;
  content: string | null;
  published_at: string | null; // ISO string
  language: string;
}

// ─── Validation ───────────────────────────────────────────────────────
function isValid(article: RawArticle): boolean {
  if (!article.title || article.title.trim().length < 10) return false;
  if (
    !article.url ||
    (!article.url.startsWith("http://") && !article.url.startsWith("https://"))
  )
    return false;
  if (article.title === article.title.toUpperCase()) return false; // clickbait filter
  return true;
}

// ─── 1. GDELT DOC API v2 ─────────────────────────────────────────────
export async function fetchGDELT(): Promise<RawArticle[]> {
  const BASE_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
  const params = new URLSearchParams({
    query: "geopolitics OR diplomacy OR conflict OR sanctions",
    mode: "artlist",
    format: "json",
    maxrecords: "15",
    timespan: "72h",
  });

  try {
    const resp = await fetch(`${BASE_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`GDELT ${resp.status}`);
    const data = await resp.json();
    const articles: RawArticle[] = [];

    for (const item of data.articles || []) {
      let published_at: string | null = null;
      const seendate = item.seendate;
      if (seendate) {
        try {
          const isoStr = `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}T${seendate.slice(9, 11)}:${seendate.slice(11, 13)}:${seendate.slice(13, 15)}Z`;
          published_at = new Date(isoStr).toISOString();
        } catch {
          /* skip invalid dates */
        }
      }

      const article: RawArticle = {
        title: item.title || "",
        url: item.url || "",
        source_name: "GDELT",
        content: null,
        published_at,
        language: "en",
      };
      if (isValid(article)) articles.push(article);
    }

    const limited = articles.slice(0, 10);
    console.log(`[GDELT] Fetched ${limited.length} articles (of ${articles.length})`);
    return limited;
  } catch (e) {
    console.error("[GDELT] Fetch failed:", e);
    return [];
  }
}

// ─── 2. RSS Feeds ─────────────────────────────────────────────────────
const RSS_FEEDS: Record<string, string> = {
  "BBC RSS": "https://feeds.bbci.co.uk/news/world/rss.xml",
  "Al Jazeera RSS": "https://www.aljazeera.com/xml/rss/all.xml",
  "Reuters RSS":
    "https://www.reuters.com/arc/outboundfeeds/news-template-feed-by-section/?section=world&size=30",
};

function parseRFC2822Date(dateStr: string): string | null {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

/**
 * Simple XML parser for RSS feeds using regex.
 * We avoid heavy XML parsing libraries to keep the bundle small.
 */
function parseRSSItems(
  xml: string,
  sourceName: string
): RawArticle[] {
  const articles: RawArticle[] = [];
  // Match <item>...</item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const title = titleMatch ? titleMatch[1].trim() : "";
    const url = linkMatch ? linkMatch[1].trim() : "";
    const description = descMatch ? descMatch[1].trim().replace(/<[^>]+>/g, "") : null;
    const published_at = pubDateMatch
      ? parseRFC2822Date(pubDateMatch[1].trim())
      : null;

    const article: RawArticle = {
      title,
      url,
      source_name: sourceName,
      content: description,
      published_at,
      language: "en",
    };

    if (isValid(article)) articles.push(article);
  }

  return articles;
}

export async function fetchRSS(): Promise<RawArticle[]> {
  const allArticles: RawArticle[] = [];

  for (const [sourceName, url] of Object.entries(RSS_FEEDS)) {
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "StrategicNewsAnalyzer/2.0" },
      });
      if (!resp.ok) {
        console.error(`[RSS] ${sourceName} HTTP ${resp.status}`);
        continue;
      }
      const xml = await resp.text();
      const articles = parseRSSItems(xml, sourceName);
      console.log(`[RSS] ${sourceName}: ${articles.length} articles`);
      allArticles.push(...articles);
    } catch (e) {
      console.error(`[RSS] ${sourceName} failed:`, e);
    }
  }

  return allArticles.slice(0, 10);
}

// ─── 3. NewsAPI.org ───────────────────────────────────────────────────
export async function fetchNewsAPI(): Promise<RawArticle[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    console.warn("[NewsAPI] Key missing, skipping");
    return [];
  }

  const params = new URLSearchParams({
    q: 'geopolitics OR "foreign policy" OR sanctions OR diplomacy OR "military conflict" OR "trade war" OR NATO OR "United Nations"',
    language: "en",
    sortBy: "publishedAt",
    pageSize: "10",
    apiKey,
  });

  try {
    const resp = await fetch(
      `https://newsapi.org/v2/everything?${params}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!resp.ok) throw new Error(`NewsAPI ${resp.status}`);
    const data = await resp.json();
    const articles: RawArticle[] = [];

    for (const item of data.articles || []) {
      let published_at: string | null = null;
      if (item.publishedAt) {
        try {
          published_at = new Date(item.publishedAt).toISOString();
        } catch {
          /* skip */
        }
      }

      const article: RawArticle = {
        title: item.title || "",
        url: item.url || "",
        source_name: item.source?.name || "NewsAPI",
        content: item.content || item.description || null,
        published_at,
        language: "en",
      };
      if (isValid(article)) articles.push(article);
    }

    const limited = articles.slice(0, 10);
    console.log(`[NewsAPI] Fetched ${limited.length} articles`);
    return limited;
  } catch (e) {
    console.error("[NewsAPI] Fetch failed:", e);
    return [];
  }
}

// ─── 4. GNews.io ──────────────────────────────────────────────────────
export async function fetchGNews(): Promise<RawArticle[]> {
  const apiKey = process.env.GNEWS_KEY;
  if (!apiKey) {
    console.warn("[GNews] Key missing, skipping");
    return [];
  }

  const params = new URLSearchParams({
    q: 'geopolitics OR diplomacy OR "foreign policy" OR conflict',
    lang: "en",
    max: "10",
    apikey: apiKey,
  });

  try {
    const resp = await fetch(`https://gnews.io/api/v4/search?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) throw new Error(`GNews ${resp.status}`);
    const data = await resp.json();
    const articles: RawArticle[] = [];

    for (const item of data.articles || []) {
      let published_at: string | null = null;
      if (item.publishedAt) {
        try {
          published_at = new Date(item.publishedAt).toISOString();
        } catch {
          /* skip */
        }
      }

      const article: RawArticle = {
        title: item.title || "",
        url: item.url || "",
        source_name: item.source?.name || "GNews",
        content: item.content || item.description || null,
        published_at,
        language: "en",
      };
      if (isValid(article)) articles.push(article);
    }

    const limited = articles.slice(0, 10);
    console.log(`[GNews] Fetched ${limited.length} articles`);
    return limited;
  } catch (e) {
    console.error("[GNews] Fetch failed:", e);
    return [];
  }
}

// ─── 5. MediaStack ────────────────────────────────────────────────────
export async function fetchMediaStack(): Promise<RawArticle[]> {
  const apiKey = process.env.MEDIASTACK_KEY;
  if (!apiKey) {
    console.warn("[MediaStack] Key missing, skipping");
    return [];
  }

  const params = new URLSearchParams({
    access_key: apiKey,
    keywords: "diplomacy",
    languages: "en",
    limit: "10",
  });

  try {
    // MediaStack free tier only supports HTTP
    const resp = await fetch(
      `http://api.mediastack.com/v1/news?${params}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!resp.ok) throw new Error(`MediaStack ${resp.status}`);
    const data = await resp.json();
    const articles: RawArticle[] = [];

    for (const item of data.data || []) {
      let published_at: string | null = null;
      if (item.published_at) {
        try {
          published_at = new Date(item.published_at).toISOString();
        } catch {
          /* skip */
        }
      }

      const article: RawArticle = {
        title: item.title || "",
        url: item.url || "",
        source_name: item.source || "MediaStack",
        content: item.description || null,
        published_at,
        language: item.language || "en",
      };
      if (isValid(article)) articles.push(article);
    }

    const limited = articles.slice(0, 10);
    console.log(`[MediaStack] Fetched ${limited.length} articles`);
    return limited;
  } catch (e) {
    console.error("[MediaStack] Fetch failed:", e);
    return [];
  }
}

// ─── Fetch All Sources ────────────────────────────────────────────────
export interface SourceFetchResult {
  source: string;
  articles: RawArticle[];
  error?: string;
}

export async function fetchAllSources(): Promise<SourceFetchResult[]> {
  const results = await Promise.allSettled([
    fetchGDELT().then((articles) => ({ source: "GDELT", articles })),
    fetchRSS().then((articles) => ({ source: "RSS", articles })),
    fetchNewsAPI().then((articles) => ({ source: "NewsAPI", articles })),
    fetchGNews().then((articles) => ({ source: "GNews", articles })),
    fetchMediaStack().then((articles) => ({ source: "MediaStack", articles })),
  ]);

  return results.map((r, i) => {
    const sources = ["GDELT", "RSS", "NewsAPI", "GNews", "MediaStack"];
    if (r.status === "fulfilled") {
      return r.value;
    }
    return {
      source: sources[i],
      articles: [],
      error: r.reason?.message || "Unknown error",
    };
  });
}
