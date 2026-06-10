import { AIAnalystChat } from "@/components/analyst/AIAnalystChat"

export default function AnalystPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 h-[calc(100vh-6rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Analyst</h1>
        <p className="text-slate-400 mt-1">Hybrid RAG Query Engine using Groq Llama-3.3-70b-versatile</p>
      </div>
      
      <div className="h-[calc(100%-5rem)]">
        <AIAnalystChat />
      </div>
    </div>
  )
}
