"use client"
import { useState, useEffect, useCallback } from "react"
import { API_BASE_URL } from "@/lib/api"
import { GlobalRiskMap } from "@/components/maps/GlobalRiskMap"
import { CountryArticlePanel } from "@/components/maps/CountryArticlePanel"
import { AIAnalystChat } from "@/components/analyst/AIAnalystChat"
import { FetchNewsButton } from "@/components/feed/FetchNewsButton"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Globe, AlertTriangle, TrendingDown, BarChart3, Loader2 } from "lucide-react"

interface CountryRiskData {
  risk: string
  score: number
  article_count: number
  avg_sentiment: number
  avg_strategic: number
  max_risk: string
}

export default function Home() {
  const [riskData, setRiskData] = useState<Record<string, CountryRiskData>>({})
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedRiskData, setSelectedRiskData] = useState<CountryRiskData | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

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

  const handleCountryClick = useCallback((countryName: string, data: CountryRiskData | null) => {
    setSelectedCountry(countryName)
    setSelectedRiskData(data)
    setPanelOpen(true)
  }, [])

  const handlePanelClose = useCallback(() => {
    setPanelOpen(false)
    // Delay clearing selection so the deselect animation plays
    setTimeout(() => {
      setSelectedCountry(null)
      setSelectedRiskData(null)
    }, 300)
  }, [])

  // Compute dashboard summary stats from risk data
  const totalCountries = Object.keys(riskData).length
  const criticalCount = Object.values(riskData).filter(d => d.risk === "Critical").length
  const highCount = Object.values(riskData).filter(d => d.risk === "High").length
  const totalArticles = new Set(Object.values(riskData).flatMap(d => d.article_count)).size > 0
    ? Object.values(riskData).reduce((sum, d) => sum + d.article_count, 0)
    : 0
  const avgGlobalSentiment = totalCountries > 0
    ? Object.values(riskData).reduce((sum, d) => sum + d.avg_sentiment, 0) / totalCountries
    : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Risk Overview</h1>
          <p className="text-slate-400 mt-1">Real-time geopolitical threat assessment from {totalArticles > 0 ? `${totalArticles} analyzed articles` : "live intelligence data"}</p>
        </div>
        <FetchNewsButton compact />
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1.5">
            <Globe className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Countries Tracked</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{loading ? "—" : totalCountries}</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400/70 mb-1.5">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Critical / High</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{loading ? "—" : `${criticalCount + highCount}`}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1.5">
            <TrendingDown className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Avg Sentiment</span>
          </div>
          <p className={`text-2xl font-bold ${avgGlobalSentiment < -0.2 ? 'text-red-400' : avgGlobalSentiment > 0.2 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {loading ? "—" : `${avgGlobalSentiment > 0 ? "+" : ""}${avgGlobalSentiment.toFixed(2)}`}
          </p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Articles Analyzed</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{loading ? "—" : totalArticles}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Geopolitical Risk Map
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-500 ml-2" />}
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Click a country to view related articles</p>
          </CardHeader>
          <CardContent className="p-0 h-[450px]">
            <GlobalRiskMap
              riskData={riskData}
              selectedCountry={selectedCountry}
              onCountryClick={handleCountryClick}
            />
          </CardContent>
        </Card>

        <div className="h-[520px]">
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
