"use client"
import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api"
import { TrendingUp, RefreshCw, CheckCircle2, XCircle, Brain, Calendar, Shield, Gauge, BookOpen } from "lucide-react"

interface Scenario { scenario: string; probability: number; triggers: string[] }
interface ForecastItem {
  id: string; event_id: string; topic: string; prediction: string
  confidence: number; timeframe: string; risk_level: string
  key_scenarios: Scenario[] | null; key_risks: string[] | null
  evidence_summary: string; chain_of_thought: string
  outcome_occurred: boolean | null; brier_score: number | null; created_at: string
}
interface AccuracyStats { average_brier_score: number; resolved_forecasts: number }

function ConfidenceArc({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444"
  return (
    <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
      <svg viewBox="0 0 64 64" className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle cx="32" cy="32" r="27" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${2 * Math.PI * 27}`}
          strokeDashoffset={`${2 * Math.PI * 27 * (1 - value)}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.3s" }}
        />
      </svg>
      <span className="stat-number text-[13px] font-bold" style={{ color }}>{pct}%</span>
    </div>
  )
}

function getBrierQuality(score: number) {
  if (score <= 0.1) return { label: "Perfect", color: "#10b981" }
  if (score <= 0.25) return { label: "Excellent", color: "#34d399" }
  if (score <= 0.5) return { label: "Moderate", color: "#f59e0b" }
  return { label: "Needs Work", color: "#ef4444" }
}

const RISK_STYLE: Record<string, string> = {
  critical: "badge-critical", high: "badge-high", medium: "badge-medium", low: "badge-low"
}

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<ForecastItem[]>([])
  const [stats, setStats] = useState<AccuracyStats>({ average_brier_score: 0, resolved_forecasts: 0 })
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true); setError(null)
    try {
      const [fRes, sRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v2/forecasts/`),
        fetch(`${API_BASE_URL}/api/v2/forecasts/accuracy`)
      ])
      if (fRes.ok && sRes.ok) {
        setForecasts(await fRes.json())
        setStats(await sRes.json())
      } else { setError("Failed to load forecasting data.") }
    } catch { setError("Could not connect to forecasting service.") }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleResolve = async (id: string, occurred: boolean) => {
    setResolvingId(id)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/forecasts/${id}/resolve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurred })
      })
      if (res.ok) fetchData()
    } catch {}
    finally { setResolvingId(null) }
  }

  const brier = getBrierQuality(stats.average_brier_score)

  return (
    <div className="max-w-[1300px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between fade-up">
        <div>
          <p className="page-header-tag mb-1">// PRED — INTELLIGENCE FORECASTING</p>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Intelligence Forecasting
          </h1>
          <p className="text-sm text-slate-600 mt-1">Falsifiable geopolitical predictions tracked via Brier Scores</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 fade-up fade-up-delay-1">
        <div className="intel-card p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15">
            <Gauge className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Avg Brier Score</p>
            <p className="stat-number text-xl font-bold text-slate-100">{stats.average_brier_score.toFixed(3)}</p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: brier.color }}>{brier.label}</p>
          </div>
        </div>
        <div className="intel-card p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-blue-500/[0.08] border border-blue-500/15">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Resolved Forecasts</p>
            <p className="stat-number text-xl font-bold text-slate-100">{stats.resolved_forecasts}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Closed predictions</p>
          </div>
        </div>
        <div className="intel-card p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-purple-500/[0.08] border border-purple-500/15">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Reasoning Engine</p>
            <p className="text-[13px] font-bold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Qwen 3.6 27B</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Cloud RAG agent</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/[0.06] border border-red-500/20 text-[12px] text-red-400 fade-up">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-56 rounded-xl" />)}
        </div>
      ) : forecasts.length === 0 ? (
        <div className="intel-card p-16 text-center fade-up">
          <BookOpen className="w-10 h-10 mx-auto text-slate-800 mb-3" />
          <p className="text-slate-400 font-medium">No forecasts generated yet</p>
          <p className="text-slate-600 text-sm mt-1">Go to Events → select an event → Generate Intelligence Forecast</p>
        </div>
      ) : (
        <div className="space-y-4">
          {forecasts.map((f, i) => (
            <div key={f.id} className="forecast-card p-5 fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
              {/* Top row */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.05]">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RISK_STYLE[f.risk_level?.toLowerCase()] || "badge-medium"}`}>
                      {f.risk_level} RISK
                    </span>
                    {f.outcome_occurred !== null && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${f.outcome_occurred ? "badge-low" : "badge-critical"}`}>
                        {f.outcome_occurred ? "Occurred" : "Did Not Occur"}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-100 leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {f.topic}
                  </h2>
                </div>
                <div className="shrink-0">
                  <ConfidenceArc value={f.confidence} />
                  <p className="text-[8px] font-mono text-slate-700 text-center mt-1 uppercase">Confidence</p>
                </div>
              </div>

              {/* Prediction */}
              <div className="py-3 border-b border-white/[0.05]">
                <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-1.5">AI Prediction</p>
                <p className="text-[13px] text-slate-300 leading-relaxed italic">"{f.prediction}"</p>
              </div>

              {/* Evidence + reasoning */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 border-b border-white/[0.05]">
                <div>
                  <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Evidence Summary
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{f.evidence_summary || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> Chain of Thought
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-4">{f.chain_of_thought || "—"}</p>
                </div>
              </div>

              {/* Scenarios */}
              {f.key_scenarios && f.key_scenarios.length > 0 && (
                <div className="py-3 border-b border-white/[0.05]">
                  <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-2">Probability Scenarios</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {f.key_scenarios.map((sc, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-mono text-slate-600">Scenario {idx + 1}</span>
                          <span className="text-[11px] font-bold text-emerald-400 stat-number">
                            {(sc.probability * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">{sc.scenario}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600">
                  <Calendar className="w-3 h-3" />
                  Timeframe: <span className="text-slate-400 font-medium">{f.timeframe || "N/A"}</span>
                  {f.brier_score !== null && (
                    <><span className="text-slate-700 mx-1">·</span>Brier: <span className="text-slate-400">{f.brier_score.toFixed(3)}</span></>
                  )}
                </div>
                {f.outcome_occurred === null && (
                  <div className="flex gap-2">
                    <button onClick={() => handleResolve(f.id, true)} disabled={resolvingId === f.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-400 bg-emerald-400/[0.06] border border-emerald-400/20 hover:bg-emerald-400/[0.12] transition-all disabled:opacity-60">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Occurred
                    </button>
                    <button onClick={() => handleResolve(f.id, false)} disabled={resolvingId === f.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-red-400 bg-red-400/[0.06] border border-red-400/20 hover:bg-red-400/[0.12] transition-all disabled:opacity-60">
                      <XCircle className="w-3.5 h-3.5" /> Did Not
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
