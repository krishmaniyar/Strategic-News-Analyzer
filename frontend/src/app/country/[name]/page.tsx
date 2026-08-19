"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { API_BASE_URL } from "@/lib/api"
import { Globe, ArrowLeft, Clock, ExternalLink, Activity, Radio } from "lucide-react"

interface Article {
  id: string
  title: string
  url: string
  published_at: string | null
  language: string
  sentiment_label: string
  sentiment_score: number
  risk_level: string
  strategic_score: number
  summary: string
  affected_regions: string[] | null
}

const RISK_COLORS: Record<string, string> = {
  Critical: "badge-critical",
  High:     "badge-high",
  Medium:   "badge-medium",
  Low:      "badge-low",
  Unknown:  "text-slate-500 bg-slate-500/10 border border-slate-500/20",
}

export default function CountryPage() {
  const params = useParams()
  const router = useRouter()
  const countryName = decodeURIComponent((params.name as string) || "")
  
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("All")
  const [sortBy, setSortBy] = useState<"date" | "risk" | "sentiment">("date")

  useEffect(() => {
    if (!countryName) return
    
    async function fetchCountryData() {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/api/v2/dashboard/risk_map/articles?country=${encodeURIComponent(countryName)}`)
        if (res.ok) {
          const data = await res.json()
          setArticles(data.articles || [])
        }
      } catch (e) {
        console.error("Failed to fetch country articles:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchCountryData()
  }, [countryName])

  let filtered = articles
  if (filter !== "All") {
    filtered = filtered.filter(a => a.risk_level === filter)
  }

  // Sorting
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "date") {
      const timeA = a.published_at ? new Date(a.published_at).getTime() : 0
      const timeB = b.published_at ? new Date(b.published_at).getTime() : 0
      return timeB - timeA
    }
    if (sortBy === "risk") {
      const riskWeight: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
      const wA = riskWeight[a.risk_level] || 0
      const wB = riskWeight[b.risk_level] || 0
      return wB - wA
    }
    if (sortBy === "sentiment") {
      // sort from lowest (most negative) to highest (most positive)
      return (a.sentiment_score || 0) - (b.sentiment_score || 0)
    }
    return 0
  })

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-20 mt-6">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-mono"
      >
        <ArrowLeft className="w-4 h-4" /> BACK TO MAP
      </button>

      {/* Header */}
      <div className="intel-card p-6 border-l-4 border-l-[#00f0ff] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00f0ff]/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-[#00f0ff]" />
              <p className="page-header-tag">// REGION INTELLIGENCE</p>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {countryName}
            </h1>
            <p className="text-slate-400 mt-1">
              {loading ? "Scanning local chatter..." : `${articles.length} strategic events detected`}
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-[#05070a] border border-white/[0.05] rounded-xl p-4 min-w-[140px]">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">Articles</p>
              <p className="text-2xl font-bold text-white">{articles.length}</p>
            </div>
            <div className="bg-[#05070a] border border-white/[0.05] rounded-xl p-4 min-w-[140px]">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">Max Risk</p>
              <p className="text-lg font-bold text-red-400 mt-1">
                {articles.some(a => a.risk_level === "Critical") ? "Critical" : 
                 articles.some(a => a.risk_level === "High") ? "High" : 
                 articles.some(a => a.risk_level === "Medium") ? "Medium" : 
                 articles.length > 0 ? "Low" : "None"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 intel-card bg-white/[0.02]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mr-2">Risk Filter:</span>
          {["All", "Critical", "High", "Medium", "Low"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all border
                ${filter === f 
                  ? (f === "All" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" : RISK_COLORS[f])
                  : "text-slate-500 bg-white/[0.02] border-white/[0.05] hover:border-white/[0.1] hover:text-slate-300"}`}>
              {f}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Sort By:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#05070a] border border-white/[0.1] text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#00f0ff]/50 cursor-pointer"
          >
            <option value="date">Most Recent</option>
            <option value="risk">Highest Risk</option>
            <option value="sentiment">Most Negative</option>
          </select>
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="intel-card p-16 text-center border-dashed border-white/[0.1]">
          <Radio className="w-10 h-10 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-300 font-medium">No intel found for this region</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or checking back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(article => {
             const riskBorderClass = {
               Critical: "risk-critical",
               High:     "risk-high",
               Medium:   "risk-medium",
               Low:      "risk-low",
             }[article.risk_level] || ""
             
             return (
              <div key={article.id} className={`intel-card p-5 ${riskBorderClass} hover:border-[#00f0ff]/40 transition-colors group flex flex-col`}>
                <div className="flex justify-between items-start gap-3 mb-2">
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
                    <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white leading-snug line-clamp-2"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {article.title}
                    </h3>
                  </a>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1.5 rounded-lg bg-white/[0.03] hover:bg-[#00f0ff]/10 text-slate-500 hover:text-[#00f0ff] transition-all">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4 flex-1">
                  {article.summary}
                </p>
                
                <div className="flex items-center flex-wrap gap-2 mt-auto pt-3 border-t border-white/[0.05]">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RISK_COLORS[article.risk_level || 'Unknown']}`}>
                    {article.risk_level}
                  </span>
                  {article.sentiment_label && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full text-slate-400 bg-white/[0.03] border border-white/[0.06]">
                      {article.sentiment_label}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 ml-auto text-[10px] font-mono text-slate-500">
                    <Clock className="w-3 h-3" />
                    {article.published_at ? new Date(article.published_at).toLocaleDateString() : "Unknown"}
                  </div>
                </div>
              </div>
             )
          })}
        </div>
      )}
    </div>
  )
}
