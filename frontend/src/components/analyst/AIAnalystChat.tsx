"use client"
import { useState, useRef, useEffect } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Bot, Send, User, ExternalLink, Sparkles } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: { id: string; title: string; url: string }[]
}

const SUGGESTED = [
  "What is the current risk status in the Middle East?",
  "Analyze Iran-US relations based on recent articles",
  "Which entities are most frequently involved in conflicts?",
  "What are the key geopolitical risks for Southeast Asia?",
]

function parseCitationsAndStyles(text: string, isUser: boolean) {
  const boldParts = text.split(/\*\*([^*]+)\*\*/g)
  return boldParts.flatMap((part, index) => {
    const isBold = index % 2 === 1
    const citationRegex = /\[Source\s*(\d+)\]/gi
    const subParts = part.split(citationRegex)
    const renderedSubparts = subParts.map((subPart, subIdx) => {
      if (subIdx % 2 === 1) {
        return (
          <span key={subIdx}
            className="inline-flex items-center justify-center font-bold px-1.5 py-0.5 rounded-[4px] text-[9px] mx-0.5 font-mono"
            style={{
              background: isUser ? "rgba(255,255,255,0.15)" : "rgba(59,130,246,0.15)",
              border: isUser ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(59,130,246,0.25)",
              color: isUser ? "#fff" : "#60a5fa",
            }}
            title={`Source ${subPart}`}
          >
            [{subPart}]
          </span>
        )
      }
      return subPart
    })
    if (isBold) {
      return <strong key={index} className={`font-semibold ${isUser ? "text-white" : "text-blue-300"}`}>{renderedSubparts}</strong>
    }
    return renderedSubparts
  })
}

function extractAnswerText(content: string): string {
  const trimmed = content.trim()
  if (!trimmed.startsWith("{")) return content
  
  const match = content.match(/"answer"\s*:\s*"([\s\S]*)/)
  if (match) {
    let result = match[1]
    // Remove trailing quote and closing brace if they exist at the very end
    result = result.replace(/"\s*}\s*$/, "")
    // Unescape common JSON escapes just in case the LLM used them
    result = result.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
    return result
  }
  return content
}

function renderContent(content: string, isUser: boolean, isStreaming?: boolean) {
  const cleanContent = isUser ? content : extractAnswerText(content)
  let textToProcess = cleanContent.trim()
  let confidence: string | null = null
  
  if (!isUser) {
    const confMatch = textToProcess.match(/\[Confidence:\s*(\w+)\]/i)
    if (confMatch) {
      confidence = confMatch[1]
      textToProcess = textToProcess.replace(/\[Confidence:\s*(\w+)\]/i, "").trim()
    }
  }

  const lines = textToProcess.split("\n")
  const parsed = lines.flatMap((line, idx) => {
    if (!line.trim()) return [<div key={`sp-${idx}`} className="h-1" />]
    if (line.startsWith("### ")) return [<h4 key={`h3-${idx}`} className="text-xs font-bold mt-2 mb-0.5 text-slate-300">{parseCitationsAndStyles(line.slice(4), isUser)}</h4>]
    if (line.startsWith("## ")) return [<h3 key={`h2-${idx}`} className="text-sm font-bold mt-2.5 mb-1 text-slate-200">{parseCitationsAndStyles(line.slice(3), isUser)}</h3>]
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      return [<ul key={`ul-${idx}`} className="list-disc pl-4 my-0.5"><li className="text-[12px] leading-relaxed">{parseCitationsAndStyles(line.trim().slice(2), isUser)}</li></ul>]
    }
    return [<p key={`p-${idx}`} className="text-[12px] leading-relaxed my-1">{parseCitationsAndStyles(line, isUser)}</p>]
  })

  return (
    <div className="space-y-0.5">
      {parsed}
      {isStreaming && <span className="typewriter-cursor" />}
      {confidence && (
        <div className="pt-2 flex justify-end">
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border
            ${confidence.toLowerCase() === "high" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
              : confidence.toLowerCase() === "medium" ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
              : "text-red-400 bg-red-400/10 border-red-400/20"}`}>
            CONFIDENCE: {confidence.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}

export function AIAnalystChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hello. I am your Geopolitical AI Analyst — powered by GPT OSS 120B with hybrid RAG retrieval over your indexed intelligence corpus. Ask me anything about current events, entities, risk assessments, or geopolitical dynamics."
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const sendMessage = async (text?: string) => {
    const msg = text || input
    if (!msg.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    const asstId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: asstId, role: "assistant", content: "" }])

    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/analyst/query_stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: msg })
      })
      if (!response.body) throw new Error("No body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let doneReading = false
      let currentContent = ""

      while (!doneReading) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "))
        for (const line of lines) {
          const data = JSON.parse(line.slice(6))
          if (data.type === "token") {
            currentContent += data.content
            setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: currentContent } : m))
          } else if (data.type === "done") {
            const uniqueSources = data.sources?.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.title === v.title) === i) || []
            setMessages(prev => prev.map(m => m.id === asstId ? { ...m, sources: uniqueSources } : m))
            doneReading = true
          } else if (data.type === "error") {
            setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: currentContent + "\n\n[Error during generation]" } : m))
            doneReading = true
          }
        }
      }
    } catch {}
    finally { setIsLoading(false) }
  }

  const showSuggestions = messages.length <= 1

  return (
    <div className="intel-card flex flex-col h-full overflow-hidden" style={{ background: "rgba(6,8,12,0.6)" }}>
      {/* Header */}
      <div className="shrink-0 px-5 py-4 border-b border-white/[0.04] flex items-center gap-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00f0ff]/[0.05] to-transparent pointer-events-none" />
        <div className="relative">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00f0ff]/20 to-[#0055ff]/20 border border-[#00f0ff]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.15)] relative z-10">
            <Bot className="w-4 h-4 text-[#00f0ff]" />
          </div>
          {isLoading && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00f0ff] live-dot ring-2 ring-[#06080c] z-20 shadow-[0_0_10px_#00f0ff]" />
          )}
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          <p className="text-[14px] font-bold text-white tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            AI Analyst
          </p>
          <p className="text-[10px] font-mono text-[#00f0ff]/70 uppercase tracking-widest mt-0.5">
            {isLoading ? "Running neural analysis..." : "Ready · GPT OSS 120B"}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase relative z-10
          ${isLoading ? "text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/30 shadow-[0_0_10px_rgba(0,240,255,0.2)]" : "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? "bg-[#00f0ff] live-dot" : "bg-emerald-400"}`} />
          {isLoading ? "Processing" : "Online"}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} fade-up`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600/30 to-indigo-700/30 border border-blue-500/20 flex items-center justify-center shrink-0 mr-2.5 mt-1">
                <Bot className="w-3.5 h-3.5 text-blue-400" />
              </div>
            )}
            <div className={`max-w-[86%] rounded-xl px-3.5 py-3
              ${msg.role === "user" ? "terminal-msg-user" : "terminal-msg-ai"}`}>
              <div className={`text-[9px] font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1
                ${msg.role === "user" ? "text-blue-300/70" : "text-slate-600"}`}>
                {msg.role === "user" ? <User className="w-2.5 h-2.5" /> : <Bot className="w-2.5 h-2.5" />}
                {msg.role === "user" ? "You" : "Analyst"}
              </div>

              <div className={msg.role === "user" ? "text-slate-100" : "text-slate-300"}>
                {msg.content === "" && isLoading && idx === messages.length - 1 ? (
                  <div className="flex gap-1 mt-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </div>
                ) : (
                  renderContent(msg.content, msg.role === "user",
                    isLoading && idx === messages.length - 1 && msg.role === "assistant")
                )}
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-white/[0.07]">
                  <p className="text-[8px] font-mono text-slate-600 uppercase tracking-wider mb-1.5">Sources</p>
                  <div className="space-y-1">
                    {msg.sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-start gap-1.5 text-[10px] text-blue-400/80 hover:text-blue-300 transition-colors group">
                        <ExternalLink className="w-2.5 h-2.5 mt-0.5 shrink-0 group-hover:text-blue-400" />
                        <span className="line-clamp-1">{s.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-lg bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shrink-0 ml-2.5 mt-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
              </div>
            )}
          </div>
        ))}

        {/* Suggested queries */}
        {showSuggestions && (
          <div className="space-y-2 fade-up fade-up-delay-2">
            <p className="text-[9px] font-mono text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Suggested Queries
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {SUGGESTED.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)}
                  className="text-left text-[11px] text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg
                    bg-white/[0.02] border border-white/[0.05] hover:border-blue-500/20 hover:bg-blue-500/[0.04] transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-4 border-t border-white/[0.04] bg-[#020306]/80 backdrop-blur-md">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage() }} className="flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 bg-[#05070a] border border-white/[0.05] rounded-xl px-4 py-3 text-[13px] text-white
              placeholder-slate-500 focus:outline-none focus:border-[#00f0ff]/50 focus:bg-[#00f0ff]/[0.02] focus:shadow-[0_0_15px_rgba(0,240,255,0.1)] transition-all"
            placeholder="Query intelligence database..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}
            className="px-4 py-3 rounded-xl text-black font-bold transition-all flex items-center gap-2
              bg-[#00f0ff] hover:bg-white hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]
              disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
