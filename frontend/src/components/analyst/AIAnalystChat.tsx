"use client"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, User, ExternalLink } from "lucide-react"

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; title: string; url: string }[];
}

export function AIAnalystChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", role: "assistant", content: "Hello. I am your Geopolitical AI Analyst. How can I assist you with strategic intelligence today?" }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    const asstId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: asstId, role: "assistant", content: "" }])

    try {
      const response = await fetch("http://localhost:8000/api/v2/analyst/query_stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg.content })
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
            setMessages(prev => prev.map(m => m.id === asstId ? { ...m, sources: data.sources } : m))
            doneReading = true
          } else if (data.type === "error") {
            console.error("Stream error:", data.content)
            setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: currentContent + "\n\n[Error encountered during generation]" } : m))
            doneReading = true
          }
        }
      }
    } catch (e) {
      console.error("Chat error:", e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="h-full flex flex-col shadow-sm border-border">
      <CardHeader className="py-4 border-b">
        <CardTitle className="flex items-center text-lg">
          <Bot className="mr-2 h-5 w-5 text-blue-600" />
          AI Analyst
        </CardTitle>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                <div className="flex items-center mb-1 text-xs opacity-70">
                  {msg.role === 'user' ? <User className="h-3 w-3 mr-1" /> : <Bot className="h-3 w-3 mr-1" />}
                  {msg.role === 'user' ? 'You' : 'Analyst'}
                </div>
                
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                
                {msg.role === 'assistant' && msg.content === "" && isLoading && (
                  <div className="flex space-x-1 mt-2">
                    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-300 dark:border-slate-700">
                    <p className="text-xs font-semibold mb-1">Sources Citations:</p>
                    <ul className="text-xs space-y-1">
                      {msg.sources.map((s, idx) => (
                        <li key={idx} className="flex items-start">
                          <ExternalLink className="h-3 w-3 mr-1 mt-0.5 shrink-0" />
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline line-clamp-1">
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <CardFooter className="p-3 border-t bg-slate-50 dark:bg-slate-900 rounded-b-xl">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex w-full space-x-2">
          <input
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Ask a strategic question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
