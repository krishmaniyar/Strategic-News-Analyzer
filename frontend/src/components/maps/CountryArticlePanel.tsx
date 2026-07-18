"use client"
import { useState, useEffect } from "react"
import { API_BASE_URL } from "@/lib/api"
import { X, ExternalLink, TrendingDown, TrendingUp, Minus, Shield, BarChart3, Newspaper } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ArticleData {
  id: string
  title: string
  url: string
  published_at: string | null
  language: string
  sentiment_label: string | null
  sentiment_score: number | null
  risk_level: string | null
  strategic_score: number | null
  summary: string | null
  affected_regions: string[] | null
}

interface CountryRiskData {
  risk: string
  score: number
  article_count: number
  avg_sentiment: number
  avg_strategic: number
  max_risk: string
}

interface CountryArticlePanelProps {
  country: string
  riskData: CountryRiskData | null
  isOpen: boolean
  onClose: () => void
}

const RISK_COLORS: Record<string, string> = {
  Low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  Medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  High: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Critical: "bg-red-500/15 text-red-400 border-red-500/25",
}

function SentimentIcon({ score }: { score: number | null }) {
  if (score === null) return <Minus className="h-3.5 w-3.5 text-slate-500" />
  if (score > 0.2) return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
  if (score < -0.2) return <TrendingDown className="h-3.5 w-3.5 text-red-400" />
  return <Minus className="h-3.5 w-3.5 text-yellow-400" />
}

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown"
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export function CountryArticlePanel({ country, riskData, isOpen, onClose }: CountryArticlePanelProps) {
  const [articles, setArticles] = useState<ArticleData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !country) return

    const fetchArticles = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/api/v2/dashboard/risk_map/articles?country=${encodeURIComponent(country)}`)
        if (!res.ok) throw new Error(`${res.status}`)
        const data = await res.json()
        setArticles(data.articles || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [isOpen, country])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-700/50 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-800 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-100 truncate">{country}</h2>
              {riskData ? (
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`text-xs border ${RISK_COLORS[riskData.risk] || RISK_COLORS.Low}`}>
                    {riskData.risk} Risk
                  </Badge>
                  <span className="text-xs text-slate-500">
                    Score: {(riskData.score * 100).toFixed(0)}%
                  </span>
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-1">No direct risk data available</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Stats row */}
          {riskData && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Newspaper className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Articles</span>
                </div>
                <p className="text-lg font-bold text-slate-100">{riskData.article_count}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <SentimentIcon score={riskData.avg_sentiment} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Sentiment</span>
                </div>
                <p className="text-lg font-bold text-slate-100">
                  {riskData.avg_sentiment > 0 ? "+" : ""}{riskData.avg_sentiment.toFixed(2)}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Strategic</span>
                </div>
                <p className="text-lg font-bold text-slate-100">{riskData.avg_strategic.toFixed(0)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Article list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="flex space-x-1.5">
                <div className="h-2.5 w-2.5 bg-blue-500 rounded-full animate-bounce" />
                <div className="h-2.5 w-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:75ms]" />
                <div className="h-2.5 w-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]" />
              </div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <Shield className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-400">Failed to load articles: {error}</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="p-6 text-center">
              <Newspaper className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No articles found for {country}</p>
              <p className="text-xs text-slate-600 mt-1">
                This country may have been included via regional tag expansion
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-500 font-medium px-1">
                {articles.length} article{articles.length !== 1 ? "s" : ""} found
              </p>
              {articles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 hover:border-slate-600/50 rounded-lg p-4 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-2 flex-1">
                      {article.title}
                    </h3>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-600 group-hover:text-blue-400 flex-shrink-0 mt-0.5" />
                  </div>

                  {article.summary && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {article.summary}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {article.risk_level && (
                      <Badge className={`text-[10px] border px-1.5 py-0 ${RISK_COLORS[article.risk_level] || RISK_COLORS.Low}`}>
                        {article.risk_level}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      <SentimentIcon score={article.sentiment_score} />
                      <span className="text-[10px] text-slate-500">
                        {article.sentiment_label || "neutral"}
                      </span>
                    </div>
                    {article.strategic_score !== null && (
                      <span className="text-[10px] text-slate-600">
                        Strategic: {article.strategic_score}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600 ml-auto">
                      {formatDate(article.published_at)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
