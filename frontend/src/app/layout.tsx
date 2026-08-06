"use client"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  ShieldAlert, Globe, Radio, Activity, GitGraph,
  BookOpen, BarChart3, Menu, X, Cpu, Wifi, WifiOff
} from "lucide-react"

const inter = Inter({ subsets: ["latin"] })

const NAV_ITEMS = [
  { href: "/",          label: "Dashboard",      icon: Globe,      tag: "SITREP" },
  { href: "/feed",      label: "Intel Feed",     icon: Radio,      tag: "LIVE"   },
  { href: "/events",    label: "Events",         icon: Activity,   tag: "CLUSTER"},
  { href: "/entities",  label: "Knowledge Graph",icon: GitGraph,   tag: "GRAPH"  },
  { href: "/forecast",  label: "Forecasting",    icon: BookOpen,   tag: "PRED"   },
  { href: "/analyst",   label: "AI Analyst",     icon: ShieldAlert,tag: "RAG"    },
  { href: "/analytics", label: "Analytics",      icon: BarChart3,  tag: "STATS"  },
]

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const [apiOnline, setApiOnline] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/health", { signal: AbortSignal.timeout(3000) })
        setApiOnline(res.ok)
      } catch { setApiOnline(false) }
      finally { setChecking(false) }
    }
    check()
    const t = setInterval(check, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}
      <aside
        className={`
          fixed md:relative z-40 md:z-auto
          flex flex-col h-full w-[220px] shrink-0
          border-r border-white/[0.05]
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ background: "rgba(4,4,12,0.97)", backdropFilter: "blur(32px)" }}
      >
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#04040c] live-dot" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-100 tracking-tight leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                SNA Platform
              </p>
              <p className="text-[9px] text-slate-600 font-mono uppercase tracking-[0.1em] mt-0.5">v2.0.0 · Command</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[9px] font-mono text-slate-700 uppercase tracking-[0.14em] px-3 mb-2">Navigation</p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className={`nav-link ${isActive ? "active" : ""}`} onClick={onClose}>
                <Icon className={`w-[15px] h-[15px] shrink-0 nav-icon ${isActive ? "text-blue-400" : "text-slate-600"}`} />
                <span className="flex-1 text-[13px]">{item.label}</span>
                <span className={`text-[8px] font-mono tracking-[0.08em] px-1.5 py-0.5 rounded-[4px] hidden xl:block
                  ${isActive ? "text-blue-400 bg-blue-400/10" : "text-slate-700 bg-white/[0.03]"}`}>
                  {item.tag}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.05] space-y-2">
          {/* API status */}
          <div className="flex items-center gap-2">
            <div className="relative">
              {apiOnline ? (
                <>
                  <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400/40 ping-ring" />
                  <Wifi className="w-3 h-3 text-emerald-400 relative" />
                </>
              ) : (
                <WifiOff className="w-3 h-3 text-red-400" />
              )}
            </div>
            <span className={`text-[10px] font-mono ${checking ? "text-slate-600" : apiOnline ? "text-emerald-400" : "text-red-400"}`}>
              {checking ? "Checking..." : apiOnline ? "API Online" : "API Offline"}
            </span>
          </div>
          {/* System tag */}
          <div className="flex items-center gap-2 text-slate-700">
            <Cpu className="w-3 h-3" />
            <span className="text-[9px] font-mono uppercase tracking-[0.08em]">Groq · Llama-3.3-70b</span>
          </div>
        </div>
      </aside>
    </>
  )
}

function LiveClock() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-mono text-[11px] text-slate-600 tabular-nums">{time} UTC+5:30</span>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <html lang="en" className="dark">
      <head>
        <title>Strategic News Analyzer</title>
        <meta name="description" content="Geopolitical Intelligence Command Center" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.className} bg-[#050508] text-slate-100 flex h-screen overflow-hidden`}>
        {/* Deep ambient glows */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[60%] h-[50%] rounded-full bg-blue-600/[0.04] blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[50%] h-[45%] rounded-full bg-indigo-900/[0.06] blur-[140px]" />
          <div className="absolute top-[30%] left-[25%] w-[40%] h-[40%] rounded-full bg-cyan-900/[0.03] blur-[180px]" />
        </div>

        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area */}
        <div className="flex flex-col flex-1 overflow-hidden relative z-10">
          {/* Top bar */}
          <header className="h-12 shrink-0 border-b border-white/[0.05] flex items-center px-4 gap-3"
            style={{ background: "rgba(5,5,10,0.8)", backdropFilter: "blur(20px)" }}>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Menu className="w-4 h-4 text-slate-400" />
            </button>

            {/* Classification tag */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-500/20 bg-amber-500/[0.05]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 live-dot" />
              <span className="text-[9px] font-mono font-bold text-amber-400/80 uppercase tracking-[0.12em]">Unclassified</span>
            </div>

            <div className="flex-1" />

            <LiveClock />

            {/* Live services pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/[0.06] border border-emerald-500/[0.15]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 ping-ring" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-semibold font-mono text-emerald-400 uppercase tracking-wider hidden sm:block">Live</span>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-5 md:p-6 bg-transparent">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
