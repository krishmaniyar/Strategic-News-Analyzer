"use client"
import { useState, useEffect, useCallback } from "react"
import { API_BASE_URL } from "@/lib/api"
import { GlobalRiskMap } from "@/components/maps/GlobalRiskMap"
import { CountryArticlePanel } from "@/components/maps/CountryArticlePanel"
import { AIAnalystChat } from "@/components/analyst/AIAnalystChat"
import { FetchNewsButton } from "@/components/feed/FetchNewsButton"
import { Globe, AlertTriangle, TrendingDown, BarChart3, Loader2, ShieldAlert, Activity } from "lucide-react"

interface CountryRiskData {
  risk: string
  score: number
  article_count: number
  avg_sentiment: number
  avg_strategic: number
  max_risk: string
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color?: "blue" | "red" | "amber" | "green"
  delay?: string
  loading?: boolean
}

function StatCard({ icon, label, value, sub, color = "blue", delay = "0s", loading }: StatCardProps) {
  const colorMap = {
    blue:  { bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.15)",  text: "#60a5fa", glow: "rgba(59,130,246,0.12)"  },
    red:   { bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.15)",   text: "#f87171", glow: "rgba(239,68,68,0.1)"   },
    amber: { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.15)",  text: "#fbbf24", glow: "rgba(245,158,11,0.1)"  },
    green: { bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.15)",  text: "#34d399", glow: "rgba(16,185,129,0.1)"  },
  }
  const c = colorMap[color]
  return (
    <div className="intel-card p-4 fade-up" style={{ animationDelay: delay, borderColor: c.border, background: c.bg }}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: c.bg, boxShadow: `0 0 16px ${c.glow}` }}>
          <div style={{ color: c.text }}>{icon}</div>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-slate-600">{label}</span>
      </div>
      {loading ? (
        <div className="skeleton h-7 w-20 mt-1" />
      ) : (
        <p className="stat-number text-2xl font-bold text-slate-100" style={{ color: c.text }}>
          {value}
        </p>
      )}
      {sub && !loading && (
        <p className="text-[10px] text-slate-600 mt-1">{sub}</p>
      )}
    </div>
  )
}

export default function Home() {
  const [riskData, setRiskData] = useState<Record<string, CountryRiskData>>({})
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedRiskData, setSelectedRiskData] = useState<CountryRiskData | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [latestArticles, setLatestArticles] = useState<{title: string, url: string}[]>([])
  const [tickerIdx, setTickerIdx] = useState(0)

  useEffect(() => {
    const fetchRiskMap = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v2/dashboard/risk_map`)
        if (!res.ok) throw new Error(`${res.status}`)
        const data = await res.json()
        setRiskData(data.countries || {})
      } catch (e) {
        console.error("Failed to load risk map data:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchRiskMap()
  }, [])

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v2/articles/?limit=20`)
        if (res.ok) {
          const data = await res.json()
          setLatestArticles(data.articles?.map((a: any) => ({ title: a.title, url: a.url })) || [])
        }
      } catch {}
    }
    fetchArticles()
  }, [])

  // Ticker rotation
  useEffect(() => {
    if (latestArticles.length === 0) return
    const t = setInterval(() => {
      setTickerIdx(i => (i + 1) % latestArticles.length)
    }, 4000)
    return () => clearInterval(t)
  }, [latestArticles])

  const handleCountryClick = useCallback((countryName: string, data: CountryRiskData | null) => {
    setSelectedCountry(countryName)
    setSelectedRiskData(data)
    setPanelOpen(true)
  }, [])

  const handlePanelClose = useCallback(() => {
    setPanelOpen(false)
    setTimeout(() => { setSelectedCountry(null); setSelectedRiskData(null) }, 300)
  }, [])

  const totalCountries = Object.keys(riskData).length
  const criticalCount = Object.values(riskData).filter(d => d.risk === "Critical").length
  const highCount = Object.values(riskData).filter(d => d.risk === "High").length
  const totalArticles = Object.values(riskData).reduce((sum, d) => sum + d.article_count, 0)
  const avgSentiment = totalCountries > 0
    ? Object.values(riskData).reduce((sum, d) => sum + d.avg_sentiment, 0) / totalCountries
    : 0

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between fade-up">
        <div>
          <p className="page-header-tag mb-1">// SITREP — GLOBAL INTELLIGENCE OVERVIEW</p>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Geopolitical Risk Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {loading ? "Loading intelligence..." : `Monitoring ${totalCountries} countries · ${totalArticles.toLocaleString()} articles analyzed`}
          </p>
        </div>
        <FetchNewsButton compact />
      </div>

      {/* KPI stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Globe className="w-4 h-4" />} label="Countries Tracked" value={loading ? "—" : totalCountries} sub="Active monitoring zones" color="blue" delay="0s" loading={loading} />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Critical / High" value={loading ? "—" : criticalCount + highCount} sub={`${criticalCount} critical, ${highCount} high`} color="red" delay="0.06s" loading={loading} />
        <StatCard icon={<TrendingDown className="w-4 h-4" />} label="Avg Sentiment" value={loading ? "—" : `${avgSentiment > 0 ? "+" : ""}${avgSentiment.toFixed(2)}`} sub={avgSentiment < -0.2 ? "Negative global mood" : "Stable sentiment"} color={avgSentiment < -0.2 ? "red" : avgSentiment > 0.2 ? "green" : "amber"} delay="0.12s" loading={loading} />
        <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Articles Analyzed" value={loading ? "—" : totalArticles.toLocaleString()} sub="AI-processed & indexed" color="green" delay="0.18s" loading={loading} />
      </div>

      {/* Main grid: Map + AI Analyst */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Risk Map — 2/3 width */}
        <div className="xl:col-span-2 intel-card overflow-hidden fade-up fade-up-delay-2">
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="text-[13px] font-semibold text-slate-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Geopolitical Risk Map
              </span>
              {loading && <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin" />}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              {["Critical","High","Medium","Low"].map((tier) => {
                const colors: Record<string, string> = { Critical:"#ef4444", High:"#f97316", Medium:"#f59e0b", Low:"#10b981" }
                return (
                  <span key={tier} className="flex items-center gap-1 text-slate-500">
                    <span className="w-2 h-2 rounded-sm" style={{ background: colors[tier] }} />
                    {tier}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="h-[400px] relative scanlines">
            <GlobalRiskMap
              riskData={riskData}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
            />
          </div>
          {/* Ticker */}
          {latestArticles.length > 0 && (
            <div className="border-t border-white/[0.05] px-4 py-2 flex items-center gap-3">
              <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-[0.1em] shrink-0">
                LATEST
              </span>
              <div className="flex-1 overflow-hidden">
                <a
                  href={latestArticles[tickerIdx]?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors truncate block"
                  style={{ transition: "opacity 0.5s" }}
                >
                  {latestArticles[tickerIdx]?.title}
                </a>
              </div>
              <Activity className="w-3 h-3 text-slate-700 shrink-0 live-dot" />
            </div>
          )}
        </div>

        {/* AI Analyst Panel — 1/3 width */}
        <div className="h-[480px] xl:h-auto fade-up fade-up-delay-3">
          <AIAnalystChat />
        </div>
      </div>

      {/* Country article panel (slide-in) */}
      <CountryArticlePanel
        country={selectedCountry || ""}
        riskData={selectedRiskData}
        isOpen={panelOpen}
        onClose={handlePanelClose}
      />
    </div>
  )
}
