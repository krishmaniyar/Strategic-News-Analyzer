"use client"
import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts"
import { BarChart2, TrendingUp, RefreshCw, AlertTriangle, Users, FileText, Globe } from "lucide-react"

// Dynamic trend data loaded from backend API

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
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    const fetchStats = async () => {
      try {
        const [res, chartsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v2/analytics/stats`),
          fetch(`${API_BASE_URL}/api/v2/analytics/charts`)
        ])
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
        if (chartsRes.ok) {
          const chartsData = await chartsRes.json()
          setMonthlyData(chartsData.monthly || [])
          setPieData(chartsData.risk_pie || [])
        }
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
            <AreaChart data={monthlyData}>
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
            <AreaChart data={monthlyData}>
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
            <BarChart data={monthlyData} barSize={24}>
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
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                dataKey="value" paddingAngle={3} strokeWidth={0}>
                {pieData.map((entry, index) => (
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
