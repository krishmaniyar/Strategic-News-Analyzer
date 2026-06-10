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
      <body className={`${inter.className} bg-slate-950 text-slate-50 flex h-screen overflow-hidden`}>
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col hidden md:flex">
          <div className="p-4 border-b border-slate-800 flex items-center space-x-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            <h1 className="font-bold text-lg tracking-tight">SNA Platform</h1>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <Link href="/" className="flex items-center px-3 py-2.5 text-sm rounded-md hover:bg-slate-800 transition-colors">
              <Globe className="h-4 w-4 mr-3 text-slate-400" /> Dashboard
            </Link>
            <Link href="/feed" className="flex items-center px-3 py-2.5 text-sm rounded-md hover:bg-slate-800 transition-colors">
              <Radio className="h-4 w-4 mr-3 text-slate-400" /> Live Feed
            </Link>
            <Link href="/events" className="flex items-center px-3 py-2.5 text-sm rounded-md hover:bg-slate-800 transition-colors">
              <Activity className="h-4 w-4 mr-3 text-slate-400" /> Events
            </Link>
            <Link href="/entities" className="flex items-center px-3 py-2.5 text-sm rounded-md hover:bg-slate-800 transition-colors">
              <GitGraph className="h-4 w-4 mr-3 text-slate-400" /> Knowledge Graph
            </Link>
            <Link href="/forecast" className="flex items-center px-3 py-2.5 text-sm rounded-md hover:bg-slate-800 transition-colors">
              <BookOpen className="h-4 w-4 mr-3 text-slate-400" /> Forecasting
            </Link>
            <Link href="/analyst" className="flex items-center px-3 py-2.5 text-sm rounded-md hover:bg-slate-800 transition-colors">
              <ShieldAlert className="h-4 w-4 mr-3 text-slate-400" /> AI Analyst
            </Link>
            <Link href="/analytics" className="flex items-center px-3 py-2.5 text-sm rounded-md hover:bg-slate-800 transition-colors">
              <BarChart3 className="h-4 w-4 mr-3 text-slate-400" /> Analytics
            </Link>
          </nav>
          <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
            v2.0.0 — System Online
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center px-6">
            <div className="flex-1"></div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-xs font-medium text-slate-300">Live Services</span>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6 bg-slate-950">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
