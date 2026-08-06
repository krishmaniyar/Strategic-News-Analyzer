"use client"
import { useState, useEffect } from "react"
import { API_BASE_URL } from "@/lib/api"
import {
  X, ExternalLink, TrendingDown, TrendingUp, Minus,
  Shield, BarChart3, Newspaper, Clock, Globe
} from "lucide-react"

interface ArticleData {
  id: string; title: string; url: string
  published_at: string | null; language: string
  sentiment_label: string | null; sentiment_score: number | null
  risk_level: string | null; strategic_score: number | null
  summary: string | null; affected_regions: string[] | null
}

interface CountryRiskData {
  risk: string; score: number; article_count: number
  avg_sentiment: number; avg_strategic: number; max_risk: string
}

interface Props {
  country: string; riskData: CountryRiskData | null
  isOpen: boolean; onClose: () => void
}

const RISK_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  Low:      { text: "#34d399", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)"  },
  Medium:   { text: "#fbbf24", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)"  },
  High:     { text: "#fb923c", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)"  },
  Critical: { text: "#f87171", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)"   },
}

function SentimentIcon({ score }: { score: number | null }) {
  if (score === null) return <Minus className="w-3 h-3 text-slate-500" />
  if (score > 0.2) return <TrendingUp className="w-3 h-3 text-emerald-400" />
  if (score < -0.2) return <TrendingDown className="w-3 h-3 text-red-400" />
  return <Minus className="w-3 h-3 text-amber-400" />
}

function fmt(iso: string | null) {
  if (!iso) return "Unknown"
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
  catch { return iso }
}

export function CountryArticlePanel({ country, riskData, isOpen, onClose }: Props) {
  const [articles, setArticles] = useState<ArticleData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !country) return
    const fetch_ = async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/api/v2/dashboard/risk_map/articles?country=${encodeURIComponent(country)}`)
        if (!res.ok) throw new Error(`${res.status}`)
        const data = await res.json()
        setArticles(data.articles || [])
      } catch (e: any) { setError(e.message) }
      finally { setLoading(false) }
    }
    fetch_()
  }, [isOpen, country])

  if (!isOpen) return null

  const rs = RISK_STYLE[riskData?.risk || ""] || RISK_STYLE.Low

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Slide-in panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[480px] z-50 flex flex-col"
        style={{
          background: "rgba(5,5,12,0.97)",
          backdropFilter: "blur(40px)",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.7)",
          animation: "slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)"
        }}
      >
        <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div className="shrink-0 p-5 border-b border-white/[0.06]"
          style={{ background: rs.bg }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.14em] mb-1">
                Country Intelligence
              </p>
              <h2 className="text-xl font-bold text-slate-100 leading-none"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {country}
              </h2>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {riskData ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                  style={{ color: rs.text, background: rs.bg, borderColor: rs.border }}>
                  {riskData.risk.toUpperCase()} RISK
                </span>
                <span className="text-[10px] font-mono text-slate-600">
                  Score: {(riskData.score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <Newspaper className="w-3 h-3" />, label: "Articles", value: riskData.article_count },
                  { icon: <SentimentIcon score={riskData.avg_sentiment} />, label: "Sentiment", value: `${riskData.avg_sentiment > 0 ? "+" : ""}${riskData.avg_sentiment.toFixed(2)}` },
                  { icon: <BarChart3 className="w-3 h-3" />, label: "Strategic", value: riskData.avg_strategic.toFixed(0) },
                ].map((s, i) => (
                  <div key={i} className="rounded-lg p-2.5 border border-white/[0.05]"
                    style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-1 text-slate-600 mb-1">
                      {s.icon}
                      <span className="text-[8px] font-mono uppercase tracking-wider">{s.label}</span>
                    </div>
                    <p className="stat-number text-sm font-bold text-slate-200">{s.value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[12px] text-slate-600">No direct risk data for this region</p>
          )}
        </div>

        {/* Article list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <Shield className="w-8 h-8 mx-auto text-red-500/40 mb-2" />
              <p className="text-[12px] text-red-400">Error loading articles: {error}</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="p-8 text-center">
              <Globe className="w-8 h-8 mx-auto text-slate-800 mb-2" />
              <p className="text-[12px] text-slate-500">No articles found for {country}</p>
              <p className="text-[10px] text-slate-700 mt-1">May have been included via regional tags</p>
            </div>
          ) : (
            <div className="p-4 space-y-2.5">
              <p className="text-[9px] font-mono text-slate-700 uppercase tracking-wider px-0.5">
                {articles.length} Article{articles.length !== 1 ? "s" : ""}
              </p>
              {articles.map(a => {
                const ar = RISK_STYLE[a.risk_level || ""] || null
                return (
                  <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                    className="block feed-card p-3.5 group"
                    style={{ borderLeftWidth: ar ? 3 : 1, borderLeftColor: ar ? ar.border : undefined }}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[12px] font-semibold text-slate-300 group-hover:text-white leading-snug line-clamp-2 flex-1 transition-colors"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {a.title}
                      </h3>
                      <ExternalLink className="w-3 h-3 text-slate-700 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" />
                    </div>

                    {a.summary && (
                      <p className="text-[10px] text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {a.summary}
                      </p>
                    )}

                    <div className="flex items-center flex-wrap gap-1.5 mt-2">
                      {a.risk_level && ar && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                          style={{ color: ar.text, background: ar.bg, borderColor: ar.border }}>
                          {a.risk_level}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <SentimentIcon score={a.sentiment_score} />
                        <span className="text-[9px] text-slate-600">{a.sentiment_label || "neutral"}</span>
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
                        <Clock className="w-2.5 h-2.5 text-slate-700" />
                        <span className="text-[9px] font-mono text-slate-700">{fmt(a.published_at)}</span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
