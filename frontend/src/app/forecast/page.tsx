"use client"
import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, RefreshCw, CheckCircle2, XCircle, Brain, Calendar, Shield, Gauge } from "lucide-react"

interface Scenario {
  scenario: string
  probability: number
  triggers: string[]
}

interface ForecastItem {
  id: string
  event_id: string
  topic: string
  prediction: string
  confidence: number
  timeframe: string
  risk_level: string
  key_scenarios: Scenario[] | null
  key_risks: string[] | null
  evidence_summary: string
  chain_of_thought: string
  outcome_occurred: boolean | null
  brier_score: number | null
  created_at: string
}

interface AccuracyStats {
  average_brier_score: number
  resolved_forecasts: number
}

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<ForecastItem[]>([])
  const [stats, setStats] = useState<AccuracyStats>({ average_brier_score: 0, resolved_forecasts: 0 })
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const forecastsRes = await fetch(`${API_BASE_URL}/api/v2/forecasts/`)
      const statsRes = await fetch(`${API_BASE_URL}/api/v2/forecasts/accuracy`)
      
      if (forecastsRes.ok && statsRes.ok) {
        const forecastsData = await forecastsRes.json()
        const statsData = await statsRes.json()
        setForecasts(forecastsData)
        setStats(statsData)
      } else {
        setErrorMessage("Failed to load forecasting data.")
      }
    } catch (e) {
      console.error("Error fetching forecasting data", e)
      setErrorMessage("Could not connect to the backend forecasting service.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleResolveForecast = async (forecastId: string, occurred: boolean) => {
    setResolvingId(forecastId)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/forecasts/${forecastId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurred })
      })
      if (res.ok) {
        fetchData() // Refresh list & stats
      } else {
        setErrorMessage("Failed to resolve forecast.")
      }
    } catch (e) {
      console.error("Error resolving forecast", e)
      setErrorMessage("Network error during forecast resolution.")
    } finally {
      setResolvingId(null)
    }
  }

  const getRiskBadge = (level: string) => {
    const l = level.toLowerCase()
    if (l === "critical" || l === "high") return "bg-red-500/10 text-red-500 border border-red-500/20"
    if (l === "medium") return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
    return "bg-green-500/10 text-green-500 border border-green-500/20"
  }

  // Format Brier score calibration text
  const getBrierQuality = (score: number) => {
    if (score <= 0.1) return "Perfect Calibration"
    if (score <= 0.25) return "Highly Accurate"
    if (score <= 0.5) return "Moderately Calibrated"
    return "Poorly Calibrated"
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="text-emerald-500 h-8 w-8" /> Intelligence Forecasting
          </h1>
          <p className="text-slate-400 mt-1">Falsifiable geopolitical predictions tracked via Brier Scores</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="border-slate-800 text-slate-300 hover:text-white" 
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Accuracy Stats Dashboard Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average Brier Score</p>
              <p className="text-3xl font-bold text-white">
                {stats.average_brier_score.toFixed(3)}
              </p>
              <p className="text-xs text-emerald-400 font-medium mt-1">
                {stats.resolved_forecasts > 0 ? getBrierQuality(stats.average_brier_score) : "No resolved cases"}
              </p>
            </div>
            <Gauge className="h-10 w-10 text-emerald-500 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resolved Forecasts</p>
              <p className="text-3xl font-bold text-white">
                {stats.resolved_forecasts}
              </p>
              <p className="text-xs text-slate-500 mt-1">Total closed predictions</p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-blue-500 opacity-60" />
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md sm:col-span-2 md:col-span-1">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Model Engine</p>
              <p className="text-xl font-bold text-white mt-1">Llama 3.3 70B</p>
              <p className="text-xs text-slate-500 mt-1">Cloud RAG Reasoning Agent</p>
            </div>
            <Brain className="h-10 w-10 text-purple-500 opacity-60" />
          </CardContent>
        </Card>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <RefreshCw className="animate-spin h-8 w-8 mx-auto text-emerald-500 mb-4" />
          Loading intelligence forecasts...
        </div>
      ) : forecasts.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-xl text-slate-400">
          <TrendingUp className="h-12 w-12 mx-auto text-slate-600 mb-4" />
          <p className="text-lg font-medium text-slate-200">No forecasts registered</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">Navigate to the Events page and select &quot;Generate Intelligence Forecast&quot; to run predictive models.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {forecasts.map((forecast) => (
            <Card key={forecast.id} className="border-slate-800 bg-slate-950/50 backdrop-blur-md">
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Geopolitical Topic</span>
                    <h2 className="text-xl font-bold text-white">{forecast.topic}</h2>
                  </div>
                  <div className="flex gap-2 flex-wrap sm:self-center">
                    <Badge className={getRiskBadge(forecast.risk_level || "Medium")}>
                      {forecast.risk_level} Risk
                    </Badge>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                      Confidence: {(forecast.confidence * 100).toFixed(0)}%
                    </Badge>
                    {forecast.outcome_occurred !== null && (
                      <Badge className="bg-slate-900 border border-slate-800 text-slate-300">
                        Brier Score: {forecast.brier_score?.toFixed(3)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI Analyst Prediction</span>
                  <p className="text-base text-slate-200 font-medium leading-relaxed bg-slate-900/40 p-4 border border-slate-800/80 rounded-xl">
                    &quot;{forecast.prediction}&quot;
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Shield className="h-4 w-4 text-slate-500" /> Key Drivers & Evidence
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/10 p-3 rounded-lg border border-slate-800/20">
                      {forecast.evidence_summary}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Brain className="h-4 w-4 text-slate-500" /> Chain of Thought (Reasoning)
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/10 p-3 rounded-lg border border-slate-800/20">
                      {forecast.chain_of_thought}
                    </p>
                  </div>
                </div>

                {forecast.key_scenarios && forecast.key_scenarios.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Probability Scenarios</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {forecast.key_scenarios.map((scenario, idx) => (
                        <div key={idx} className="p-3 border border-slate-800 bg-slate-900/20 rounded-xl space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-slate-400">Scenario {idx+1}</span>
                            <Badge variant="outline" className="text-emerald-400 border-emerald-500/20 bg-emerald-500/5 text-[10px]">
                              {(scenario.probability * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-200 font-medium leading-normal">{scenario.scenario}</p>
                          {scenario.triggers && scenario.triggers.length > 0 && (
                            <div className="pt-1.5">
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Triggers:</span>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{scenario.triggers.join(", ")}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-slate-800/80 pt-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-4 w-4" /> Timeframe: <span className="font-semibold text-slate-300">{forecast.timeframe || "N/A"}</span>
                  </div>

                  {forecast.outcome_occurred === null ? (
                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-initial border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => handleResolveForecast(forecast.id, true)}
                        disabled={resolvingId === forecast.id}
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Resolve as Occurred
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-initial border-red-500/20 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleResolveForecast(forecast.id, false)}
                        disabled={resolvingId === forecast.id}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" />
                        Resolve as Did Not Occur
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">Resolution outcome:</span>
                      <Badge className={forecast.outcome_occurred ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}>
                        {forecast.outcome_occurred ? "Occurred" : "Did Not Occur"}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
