"use client"
import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Activity, RefreshCw, Sparkles, CheckCircle, XCircle, Globe, Clock, ChevronRight } from "lucide-react"

interface EventItem {
  id: string
  title: string
  description: string
  status: string
  risk_level: string
  involved_entity_ids: string[] | null
  affected_regions: string[] | null
  last_updated: string
}

const RISK_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Critical: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "#f87171", dot: "#ef4444" },
  High:     { bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)", text: "#fb923c", dot: "#f97316" },
  Medium:   { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", text: "#fbbf24", dot: "#f59e0b" },
  Low:      { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", text: "#34d399", dot: "#10b981" },
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  escalating:     { label: "ESCALATING",    color: "#f87171" },
  "de-escalating":{ label: "DE-ESCALATING", color: "#34d399" },
  resolved:       { label: "RESOLVED",      color: "#60a5fa" },
  ongoing:        { label: "ONGOING",        color: "#fbbf24" },
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EventItem | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchEvents = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/events`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data)
        if (data.length > 0) setSelected(data[0])
      } else {
        setErrorMsg("Failed to load events.")
      }
    } catch {
      setErrorMsg("Could not connect to backend.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvents() }, [])

  const handleForecast = async (eventId: string) => {
    setGeneratingId(eventId)
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/forecasts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId })
      })
      if (res.ok) {
        const data = await res.json()
        setSuccessMsg(`Forecast generated: "${data.prediction?.slice(0, 80) || "Analysis complete"}"`)
      } else {
        const err = await res.json()
        setErrorMsg(`Forecast failed: ${err.detail || "Server error"}`)
      }
    } catch {
      setErrorMsg("Network error during forecast generation.")
    } finally {
      setGeneratingId(null)
    }
  }

  const rs = (ev: EventItem) => RISK_STYLES[ev.risk_level] || RISK_STYLES.Medium
  const ss = (ev: EventItem) => STATUS_STYLES[ev.status?.toLowerCase()] || { label: ev.status?.toUpperCase(), color: "#64748b" }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between fade-up">
        <div>
          <p className="page-header-tag mb-1">// EVENTS — GEOPOLITICAL CLUSTERS</p>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Active Event Clusters
          </h1>
          <p className="text-sm text-slate-600 mt-1">HDBSCAN embedding-density cluster detection</p>
        </div>
        <button onClick={fetchEvents} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 fade-up">
          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12px] font-semibold text-emerald-300">Forecast Generated</p>
            <p className="text-[11px] text-emerald-500 mt-0.5">{successMsg}</p>
            <a href="/forecast" className="text-[11px] text-blue-400 hover:underline mt-1 inline-block">
              View Forecasting Dashboard →
            </a>
          </div>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/[0.06] border border-red-500/20 fade-up">
          <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12px] font-semibold text-red-300">Error</p>
            <p className="text-[11px] text-red-500 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
          <div className="md:col-span-2 skeleton h-80 rounded-xl" />
        </div>
      ) : events.length === 0 ? (
        <div className="intel-card p-16 text-center">
          <Globe className="w-10 h-10 mx-auto text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">No active events found</p>
          <p className="text-slate-600 text-sm mt-1">Ingest more articles and run clustering to discover events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Event timeline list */}
          <div className="space-y-2 fade-up fade-up-delay-1">
            <p className="text-[9px] font-mono text-slate-700 uppercase tracking-[0.12em] px-1">
              {events.length} Events
            </p>
            {events.map((event, i) => {
              const r = rs(event)
              const s = ss(event)
              const isSelected = selected?.id === event.id
              return (
                <button key={event.id}
                  onClick={() => setSelected(event)}
                  className={`w-full text-left p-3 rounded-xl border transition-all
                    ${isSelected
                      ? "border-blue-500/30 bg-blue-500/[0.07]"
                      : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08]"}`}
                  style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-1 w-2 h-2 rounded-full shrink-0 ring-2 ring-[#050508]"
                      style={{ background: r.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-200 leading-snug line-clamp-2"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-mono font-bold" style={{ color: s.color }}>
                          {s.label}
                        </span>
                        <span className="text-[9px] text-slate-700">·</span>
                        <span className="text-[9px] font-mono" style={{ color: r.text }}>{event.risk_level}</span>
                      </div>
                    </div>
                    {isSelected && <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Event detail panel */}
          {selected && (() => {
            const r = rs(selected)
            const s = ss(selected)
            return (
              <div className="lg:col-span-2 intel-card p-5 space-y-4 fade-up fade-up-delay-2"
                style={{ borderColor: r.border, background: r.bg }}>
                {/* Title + badges */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border"
                      style={{ color: r.text, borderColor: r.border, background: r.bg }}>
                      {selected.risk_level.toUpperCase()} RISK
                    </span>
                    <span className="text-[9px] font-mono font-bold" style={{ color: s.color }}>
                      ● {s.label}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-100 leading-snug"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {selected.title}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="w-3 h-3 text-slate-600" />
                    <span className="text-[10px] font-mono text-slate-600">
                      Last updated: {new Date(selected.last_updated).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-white/[0.05]" />

                {/* Description */}
                <p className="text-[13px] text-slate-400 leading-relaxed">{selected.description}</p>

                {/* Regions + entities */}
                <div className="grid grid-cols-2 gap-4">
                  {selected.affected_regions && selected.affected_regions.length > 0 && (
                    <div>
                      <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-2">Affected Regions</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.affected_regions.map(r => (
                          <span key={r} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full text-slate-400 bg-white/[0.03] border border-white/[0.06]">
                            <Globe className="w-2.5 h-2.5" />{r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selected.involved_entity_ids && selected.involved_entity_ids.length > 0 && (
                    <div>
                      <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-2">Involved Entities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.involved_entity_ids.slice(0, 8).map((e, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full text-slate-400 bg-blue-500/[0.08] border border-blue-500/[0.15]">
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/[0.05]" />

                {/* Generate forecast */}
                <button
                  onClick={() => handleForecast(selected.id)}
                  disabled={generatingId === selected.id}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all
                    bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
                    disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30"
                >
                  {generatingId === selected.id ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Generating Predictive Model...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Intelligence Forecast</>
                  )}
                </button>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
