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
import { API_BASE_URL } from "@/lib/api"

import Image from "next/image"

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
        const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) })
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
        <div className="fixed inset-0 z-30 bg-black/80 backdrop-blur-md md:hidden" onClick={onClose} />
      )}
      <aside
        className={`
          fixed md:relative z-40 md:z-auto
          flex flex-col h-full w-[240px] shrink-0
          border-r border-white/[0.04]
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ background: "rgba(2, 3, 6, 0.75)", backdropFilter: "blur(40px)" }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-white/[0.04] relative">
          {/* Subtle logo background glow */}
          <div className="absolute top-1/2 left-8 w-12 h-12 bg-[#00f0ff]/[0.15] blur-xl rounded-full pointer-events-none transform -translate-y-1/2" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="relative flex-shrink-0 group">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#00f0ff]/20 shadow-[0_0_15px_rgba(0,240,255,0.15)] group-hover:border-[#00f0ff]/40 transition-colors">
                <Image src="/logo.png" alt="SNA Logo" width={36} height={36} className="object-cover" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#020306] live-dot shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-white tracking-wide leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                SNA Platform
              </p>
              <p className="text-[9px] text-[#00f0ff]/70 font-mono uppercase tracking-[0.15em] mt-1.5 font-semibold">v3.0.0 · Core</p>
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
            <span className="text-[9px] font-mono uppercase tracking-[0.08em]">Groq · GPT OSS 120B</span>
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
      <body className={`${inter.className} bg-[#020306] text-slate-100 flex h-screen overflow-hidden`}>
        {/* Deep ambient glows */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#00f0ff]/[0.03] blur-[150px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0055ff]/[0.04] blur-[160px]" />
          <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-[#ff0055]/[0.015] blur-[180px]" />
        </div>

        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area */}
        <div className="flex flex-col flex-1 overflow-hidden relative z-10">
          {/* Top bar */}
          <header className="h-14 shrink-0 border-b border-white/[0.04] flex items-center px-6 gap-4"
            style={{ background: "rgba(2,3,6,0.5)", backdropFilter: "blur(20px)" }}>
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
