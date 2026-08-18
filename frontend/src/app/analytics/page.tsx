"use client"
import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts"
import { BarChart2, TrendingUp, RefreshCw, AlertTriangle, Users, FileText, Globe } from "lucide-react"

// Mock trend data (real volume data comes from backend)
const MONTHLY = [
  { month: "Feb", risk: 30, sentiment: 5,   articles: 32  },
  { month: "Mar", risk: 45, sentiment: -20, articles: 40  },
  { month: "Apr", risk: 60, sentiment: -40, articles: 55  },
  { month: "May", risk: 55, sentiment: -15, articles: 48  },
  { month: "Jun", risk: 70, sentiment: -50, articles: 72  },
  { month: "Jul", risk: 85, sentiment: -60, articles: 90  },
  { month: "Aug", risk: 78, sentiment: -45, articles: 110 },
]

const RISK_PIE = [
  { name: "Critical", value: 8,  color: "#ef4444" },
  { name: "High",     value: 22, color: "#f97316" },
  { name: "Medium",   value: 38, color: "#f59e0b" },
  { name: "Low",      value: 32, color: "#10b981" },
]

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(8,10,24,0.97)",
    border: "1px solid rgba(59,130,246,0.2)",
    borderRadius: 10,
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    color: "#cbd5e1",
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
  },
  labelStyle: { color: "#60a5fa", fontWeight: 600 },
  itemStyle: { color: "#94a3b8" },
}

interface BackendStats {
  articles: number
  events: number
  entities: number
  forecasts: number
}

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<BackendStats>({ articles: 0, events: 0, entities: 0, forecasts: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    const fetchStats = async () => {
      try {
        const [aRes, eRes, entRes, fRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v2/articles?limit=1`),
          fetch(`${API_BASE_URL}/api/v2/events?limit=1`),
          fetch(`${API_BASE_URL}/api/v2/entities?limit=1`),
          fetch(`${API_BASE_URL}/api/v2/forecasts/`),
        ])
        const articles = aRes.ok ? (await aRes.json()).count ?? 0 : 0
        const evRes2 = eRes.ok ? await eRes.json() : []
        const entRes2 = entRes.ok ? await entRes.json() : []
        const forecasts = fRes.ok ? (await fRes.json()).length ?? 0 : 0
        setStats({
          articles,
          events: Array.isArray(evRes2) ? evRes2.length : 0,
          entities: Array.isArray(entRes2) ? entRes2.length : 0,
          forecasts
        })
      } catch {}
      finally { setLoading(false) }
    }
    fetchStats()
  }, [])

  if (!mounted) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
    </div>
  )

  const KPI = [
    { label: "Articles Indexed", value: loading ? "—" : stats.articles.toLocaleString(), icon: <FileText className="w-4 h-4" />, color: "blue" },
    { label: "Active Events",    value: loading ? "—" : stats.events,    icon: <AlertTriangle className="w-4 h-4" />, color: "red" },
    { label: "Tracked Entities", value: loading ? "—" : stats.entities,  icon: <Users className="w-4 h-4" />,        color: "purple" },
    { label: "Forecasts Generated", value: loading ? "—" : stats.forecasts, icon: <Globe className="w-4 h-4" />,   color: "green" },
  ]

  const KPI_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    blue:   { bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.15)",  text: "#60a5fa",  glow: "rgba(59,130,246,0.1)" },
    red:    { bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.15)",   text: "#f87171",  glow: "rgba(239,68,68,0.08)" },
    purple: { bg: "rgba(139,92,246,0.06)",  border: "rgba(139,92,246,0.15)",  text: "#c084fc",  glow: "rgba(139,92,246,0.08)" },
    green:  { bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.15)",  text: "#34d399",  glow: "rgba(16,185,129,0.08)" },
  }

  return (
    <div className="max-w-[1300px] mx-auto space-y-5">
      {/* Header */}
      <div className="fade-up">
        <p className="page-header-tag mb-1">// STATS — SYSTEM ANALYTICS</p>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          System Analytics
        </h1>
        <p className="text-sm text-slate-600 mt-1">Longitudinal intelligence metrics and risk distribution</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 fade-up fade-up-delay-1">
        {KPI.map((k, i) => {
          const c = KPI_COLORS[k.color]
          return (
            <div key={i} className="intel-card p-4" style={{ borderColor: c.border, background: c.bg }}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ background: c.bg, boxShadow: `0 0 16px ${c.glow}` }}>
                  <div style={{ color: c.text }}>{k.icon}</div>
                </div>
                <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">{k.label}</span>
              </div>
              <p className="stat-number text-2xl font-bold" style={{ color: c.text }}>{k.value}</p>
            </div>
          )
        })}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risk Index */}
        <div className="intel-card p-4 fade-up fade-up-delay-2">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[12px] font-semibold text-slate-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Geopolitical Risk Index
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" {...TOOLTIP_STYLE.itemStyle} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} fill="url(#riskGrad)" dot={{ fill: "#ef4444", r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment trend */}
        <div className="intel-card p-4 fade-up fade-up-delay-2" style={{ animationDelay: "0.06s" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[12px] font-semibold text-slate-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Editorial Sentiment Drift
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="sentiment" stroke="#3b82f6" strokeWidth={2} fill="url(#sentGrad)" dot={{ fill: "#3b82f6", r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Ingestion volume */}
        <div className="intel-card p-4 fade-up fade-up-delay-3">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[12px] font-semibold text-slate-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Intelligence Ingestion Volume
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="articles" fill="#3b82f6" radius={[5, 5, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk distribution pie */}
        <div className="intel-card p-4 fade-up fade-up-delay-3" style={{ animationDelay: "0.06s" }}>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[12px] font-semibold text-slate-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Risk Level Distribution
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={RISK_PIE} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                dataKey="value" paddingAngle={3} strokeWidth={0}>
                {RISK_PIE.map((entry, index) => (
                  <Cell key={index} fill={entry.color} opacity={0.85} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend formatter={(value) => (
                <span style={{ color: "#64748b", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
              )} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
