"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { API_BASE_URL, WS_BASE_URL } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Radio, RefreshCw, ExternalLink, AlertTriangle, Clock, Globe, Wifi, WifiOff, Filter } from "lucide-react"

interface Article {
  id: string
  title: string
  url: string
  published_at: string | null
  language: string
  is_processed: boolean
  analysis?: {
    sentiment_label: string
    sentiment_score: number
    risk_level: string
    summary: string
    affected_regions: string[] | null
    key_drivers: string[] | null
  }
}

const RISK_COLORS: Record<string, string> = {
  Critical: "badge-critical",
  High:     "badge-high",
  Medium:   "badge-medium",
  Low:      "badge-low",
  Unknown:  "text-slate-500 bg-slate-500/10 border border-slate-500/20",
}

function ArticleCard({ article, isNew }: { article: Article; isNew?: boolean }) {
  const risk = article.analysis?.risk_level || "Unknown"
  const riskBorderClass = {
    Critical: "risk-critical",
    High:     "risk-high",
    Medium:   "risk-medium",
    Low:      "risk-low",
  }[risk] || ""

  return (
    <div className={`feed-card p-4 ${riskBorderClass} ${isNew ? "new-article" : ""}`}>
      {isNew && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 live-dot" />
          <span className="text-[9px] font-mono text-blue-400 uppercase tracking-[0.1em]">New</span>
        </div>
      )}

      <a href={article.url} target="_blank" rel="noopener noreferrer"
        className="block group">
        <h3 className="text-[13px] font-semibold text-slate-200 group-hover:text-white leading-snug mb-2 transition-colors line-clamp-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {article.title}
          <ExternalLink className="w-3 h-3 ml-1 inline-block text-slate-600 group-hover:text-blue-400 transition-colors" />
        </h3>
      </a>

      {article.analysis?.summary && (
        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
          {article.analysis.summary}
        </p>
      )}

      <div className="flex items-center flex-wrap gap-1.5 mt-2">
        {article.analysis && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RISK_COLORS[risk]}`}>
            {risk}
          </span>
        )}
        {article.analysis?.sentiment_label && (
          <span className="text-[10px] px-2 py-0.5 rounded-full text-slate-500 bg-white/[0.03] border border-white/[0.06]">
            {article.analysis.sentiment_label}
          </span>
        )}
        {article.analysis?.affected_regions?.slice(0, 2).map(r => (
          <span key={r} className="text-[10px] px-2 py-0.5 rounded-full text-slate-600 bg-white/[0.02] border border-white/[0.04] flex items-center gap-1">
            <Globe className="w-2.5 h-2.5" />{r}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/[0.04]">
        <Clock className="w-3 h-3 text-slate-700" />
        <span className="text-[10px] font-mono text-slate-600">
          {article.published_at ? new Date(article.published_at).toLocaleString() : "Unknown date"}
        </span>
        {article.language && article.language !== "en" && (
          <span className="ml-auto text-[9px] font-mono text-slate-700 uppercase">{article.language}</span>
        )}
      </div>
    </div>
  )
}

type RiskFilter = "All" | "Critical" | "High" | "Medium" | "Low"

export default function FeedPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [liveArticles, setLiveArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected">("disconnected")
  const [filter, setFilter] = useState<RiskFilter>("All")
  const [showProcessed, setShowProcessed] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const limit = 50

  const fetchArticles = useCallback(async (pageNum: number, searchQuery: string, isLoadMore = false) => {
    if (!isLoadMore) setLoading(true)
    else setLoadingMore(true)

    try {
      const offset = pageNum * limit
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
      const res = await fetch(`${API_BASE_URL}/api/v2/articles?limit=${limit}&offset=${offset}${searchParam}`)
      if (res.ok) {
        const data = await res.json()
        const newArticles = data.articles || []
        
        if (newArticles.length < limit) setHasMore(false)
        else setHasMore(true)

        if (isLoadMore) {
          setArticles(prev => [...prev, ...newArticles])
        } else {
          setArticles(newArticles)
          setLiveArticles([]) // reset live articles on new search
        }
      }
    } catch (e) {
      console.error("Failed to fetch articles:", e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setPage(0)
    fetchArticles(0, search, false)
  }, [search, fetchArticles])

  useEffect(() => {
    // WebSocket for live feed
    const ws = new WebSocket(`${WS_BASE_URL}/ws/feed`)
    wsRef.current = ws
    ws.onopen = () => setWsStatus("connected")
    ws.onclose = () => setWsStatus("disconnected")
    ws.onerror = () => setWsStatus("disconnected")
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "new_article") {
          // Only add to live feed if there is no active search to prevent confusion
          if (!search) {
             setLiveArticles(prev => [data.data, ...prev.slice(0, 49)])
          }
        }
      } catch {}
    }
    return () => ws.close()
  }, [search])

  const allArticles = [...liveArticles, ...articles]
  // Deduplicate by ID
  const uniqueArticles = allArticles.filter((a, i, arr) => arr.findIndex(t => t.id === a.id) === i)
  
  const filtered = uniqueArticles.filter(a => {
    if (showProcessed && !a.is_processed && !a.analysis) return false
    if (filter === "All") return true
    return a.analysis?.risk_level === filter
  })

  const FILTERS: RiskFilter[] = ["All", "Critical", "High", "Medium", "Low"]
  const FILTER_COLORS: Record<string, string> = {
    All: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    Critical: "badge-critical",
    High: "badge-high",
    Medium: "badge-medium",
    Low: "badge-low",
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 fade-up">
        <div>
          <p className="page-header-tag mb-1">// INTEL FEED — LIVE ARTICLE STREAM</p>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Intelligence Feed
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {loading ? "Loading..." : `${filtered.length.toLocaleString()} articles loaded · Real-time geopolitical analysis`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* WS status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono
            ${wsStatus === "connected"
              ? "text-emerald-400 bg-emerald-400/[0.06] border-emerald-400/20"
              : "text-red-400 bg-red-400/[0.06] border-red-400/20"}`}>
            {wsStatus === "connected" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {wsStatus === "connected" ? "WS Live" : "WS Off"}
          </div>
          <button onClick={() => { setPage(0); fetchArticles(0, search, false) }} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 fade-up fade-up-delay-1 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">Risk:</span>
          {FILTERS.map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all
                ${filter === f ? FILTER_COLORS[f] : "text-slate-600 bg-white/[0.02] border-white/[0.05] hover:border-white/[0.1] hover:text-slate-400"}`}>
              {f}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer ml-2">
            <input type="checkbox" checked={showProcessed} onChange={e => setShowProcessed(e.target.checked)}
              className="accent-blue-500 w-3 h-3" />
            AI-analyzed only
          </label>
        </div>
        
        <div className="md:ml-auto w-full md:w-64">
          <input
            type="text"
            placeholder="Search intel feed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#05070a] border border-white/[0.05] rounded-lg px-3 py-1.5 text-[12px] text-white
              placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]/50 focus:bg-[#00f0ff]/[0.02] transition-all"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="intel-card p-16 text-center">
          <Radio className="w-10 h-10 mx-auto text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">No articles match the current filter or search</p>
          <p className="text-slate-600 text-sm mt-1">Try changing the risk filter or search query</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                isNew={liveArticles.some(la => la.id === article.id)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button 
                onClick={() => {
                  const nextPage = page + 1
                  setPage(nextPage)
                  fetchArticles(nextPage, search, true)
                }}
                disabled={loadingMore}
                className="px-6 py-2 rounded-lg text-[13px] font-semibold text-[#00f0ff] border border-[#00f0ff]/30 bg-[#00f0ff]/5 hover:bg-[#00f0ff]/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all flex items-center gap-2"
              >
                {loadingMore ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
