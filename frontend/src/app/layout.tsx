import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Link from "next/link"
import { ShieldAlert, Globe, Radio, Activity, GitGraph, BookOpen, BarChart3 } from "lucide-react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Strategic News Analyzer",
  description: "Geopolitical Intelligence Dashboard",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-slate-100 flex h-screen overflow-hidden relative`}>
        {/* Ambient Glowing Orbs */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[130px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-950/15 blur-[130px] pointer-events-none z-0" />
        <div className="absolute top-[40%] left-[30%] w-[35%] h-[35%] rounded-full bg-cyan-950/10 blur-[150px] pointer-events-none z-0" />

        {/* Sidebar */}
        <aside className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-2xl flex flex-col hidden md:flex z-10 relative">
          <div className="p-4 border-b border-white/5 flex items-center space-x-3 bg-white/[0.01]">
            <ShieldAlert className="h-6 w-6 text-red-500 animate-pulse" />
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              SNA Platform
            </h1>
          </div>
          <nav className="flex-1 p-4 space-y-1.5">
            {[
              { href: "/", label: "Dashboard", icon: Globe },
              { href: "/feed", label: "Live Feed", icon: Radio },
              { href: "/events", label: "Events", icon: Activity },
              { href: "/entities", label: "Knowledge Graph", icon: GitGraph },
              { href: "/forecast", label: "Forecasting", icon: BookOpen },
              { href: "/analyst", label: "AI Analyst", icon: ShieldAlert },
              { href: "/analytics", label: "Analytics", icon: BarChart3 }
            ].map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center px-3 py-2.5 text-sm rounded-xl text-slate-400 hover:text-white bg-transparent hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-300 backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 mr-3 text-slate-400 group-hover:text-white" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t border-white/5 text-xs text-slate-500 bg-white/[0.005]">
            v2.0.0 — System Online
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10 bg-transparent">
          <header className="h-14 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center px-6">
            <div className="flex-1"></div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center px-3 py-1 rounded-full bg-green-500/5 border border-green-500/10">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">Live Services</span>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6 bg-transparent">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
