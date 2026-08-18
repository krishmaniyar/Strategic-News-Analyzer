"use client"
import { AIAnalystChat } from "@/components/analyst/AIAnalystChat"
import { ShieldAlert, Cpu, Database, Zap } from "lucide-react"

export default function AnalystPage() {
  return (
    <div className="max-w-[1100px] mx-auto flex flex-col h-[calc(100vh-6rem)] gap-4">
      {/* Header */}
      <div className="shrink-0 fade-up">
        <p className="page-header-tag mb-1">// RAG — GEOPOLITICAL AI ANALYST</p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              AI Analyst Interface
            </h1>
            <p className="text-sm text-slate-600 mt-1">Hybrid RAG query engine · Groq Qwen-3.6-27b</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/[0.06] border border-purple-500/15">
              <Cpu className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] font-mono text-purple-400">Qwen 3.6 27B</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/[0.06] border border-blue-500/15">
              <Database className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-mono text-blue-400">Vector RAG</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-400">Streaming SSE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 min-h-0 fade-up fade-up-delay-1">
        <AIAnalystChat />
      </div>
    </div>
  )
}
