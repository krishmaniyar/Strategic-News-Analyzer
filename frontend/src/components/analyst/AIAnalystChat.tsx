"use client"
import { useState, useRef, useEffect } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot, Send, User, ExternalLink } from "lucide-react"

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; title: string; url: string }[];
}

function parseCitationsAndStyles(text: string, isUser: boolean) {
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);
  
  return boldParts.flatMap((part, index) => {
    const isBold = index % 2 === 1;
    const citationRegex = /\[Source\s*(\d+)\]/gi;
    const subParts = part.split(citationRegex);
    
    const renderedSubparts = subParts.map((subPart, subIdx) => {
      if (subIdx % 2 === 1) {
        const sourceNum = subPart;
        return (
          <span 
            key={subIdx} 
            className={`inline-flex items-center justify-center font-bold px-1.5 py-0.5 rounded text-[10px] mx-0.5 select-none ${
              isUser 
                ? 'bg-white/20 text-white' 
                : 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-600/10 dark:border-blue-500/20'
            }`}
            title={`Source ${sourceNum}`}
          >
            Source {sourceNum}
          </span>
        );
      }
      return subPart;
    });

    if (isBold) {
      return <strong key={index} className={`font-semibold ${isUser ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>{renderedSubparts}</strong>;
    }
    return renderedSubparts;
  });
}

function extractAnswerText(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) {
    return content;
  }
  
  // Try to find the start of the answer string.
  // It usually matches something like `"answer"\s*:\s*"`
  const answerKeyIndex = trimmed.indexOf('"answer"');
  if (answerKeyIndex === -1) {
    return ""; // Still streaming the key
  }
  
  // Find the colon after the key
  const colonIndex = trimmed.indexOf(':', answerKeyIndex + 8);
  if (colonIndex === -1) {
    return "";
  }
  
  // Find the first quote after the colon
  const quoteIndex = trimmed.indexOf('"', colonIndex + 1);
  if (quoteIndex === -1) {
    return "";
  }
  
  // The content starts from quoteIndex + 1
  const startIndex = quoteIndex + 1;
  
  // Extract characters up to the end of the string, handling escapes
  let result = "";
  let isEscaped = false;
  
  for (let i = startIndex; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (isEscaped) {
      if (char === 'n') result += '\n';
      else if (char === 't') result += '\t';
      else if (char === 'r') result += '\r';
      else result += char;
      isEscaped = false;
    } else if (char === '\\') {
      isEscaped = true;
    } else if (char === '"') {
      // We found the closing quote of the answer string!
      break;
    } else {
      result += char;
    }
  }
  
  return result;
}

function renderFormattedContent(content: string, isUser: boolean) {
  const cleanContent = isUser ? content : extractAnswerText(content);
  
  let confidence: string | null = null;
  const confidenceMatch = cleanContent.match(/\[Confidence:\s*(\w+)\]/i);
  let textToProcess = cleanContent;
  if (confidenceMatch) {
    confidence = confidenceMatch[1];
    textToProcess = cleanContent.replace(/\[Confidence:\s*(\w+)\]/i, "").trim();
  }

  const lines = textToProcess.split("\n");
  const parsedLines = lines.flatMap((line, idx) => {
    if (!line.trim()) return [<div key={`space-${idx}`} className="h-1.5" />];
    
    if (line.startsWith("### ")) {
      return [<h4 key={`h3-${idx}`} className="text-sm font-bold mt-2.5 mb-1">{parseCitationsAndStyles(line.slice(4), isUser)}</h4>];
    }
    if (line.startsWith("## ")) {
      return [<h3 key={`h2-${idx}`} className="text-base font-bold mt-3 mb-1.5">{parseCitationsAndStyles(line.slice(3), isUser)}</h3>];
    }
    
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const cleanLine = line.trim().slice(2);
      return [
        <ul key={`ul-${idx}`} className="list-disc pl-5 my-0.5 opacity-95">
          <li className="text-sm">{parseCitationsAndStyles(cleanLine, isUser)}</li>
        </ul>
      ];
    }

    const sentences = line.split(/(?<=[.!?])\s+(?=[A-Z])/);
    const paragraphs: string[] = [];
    let currentParagraph = "";
    
    sentences.forEach((sentence) => {
      const startsWithTransition = /^(however|overall|the conflict|according to|moreover|furthermore|in addition)/i.test(sentence);
      
      if (startsWithTransition && currentParagraph) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = sentence + " ";
      } else {
        currentParagraph += sentence + " ";
        if (currentParagraph.split(/(?<=[.!?])\s+/).length > 3) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = "";
        }
      }
    });
    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }

    return paragraphs.map((paraText, pIdx) => (
      <p key={`p-${idx}-${pIdx}`} className="text-sm leading-relaxed my-1.5 opacity-95">
        {parseCitationsAndStyles(paraText, isUser)}
      </p>
    ));
  });

  return (
    <div className="space-y-2">
      {parsedLines}
      {confidence && (
        <div className="pt-2 flex justify-end">
          <Badge className={`text-[10px] py-0.5 px-2 border font-semibold select-none ${
            confidence.toLowerCase() === 'high' 
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : confidence.toLowerCase() === 'medium'
                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
          }`}>
            Confidence: {confidence}
          </Badge>
        </div>
      )}
    </div>
  );
}

export function AIAnalystChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", role: "assistant", content: "Hello. I am your Geopolitical AI Analyst. How can I assist you with strategic intelligence today?" }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    const asstId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: asstId, role: "assistant", content: "" }])

    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/analyst/query_stream`, {
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
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                <div className="flex items-center mb-1.5 text-xs opacity-75">
                  {msg.role === 'user' ? <User className="h-3 w-3 mr-1" /> : <Bot className="h-3 w-3 mr-1 text-blue-600 dark:text-blue-400" />}
                  <span className="font-semibold">{msg.role === 'user' ? 'You' : 'Analyst'}</span>
                </div>
                
                <div className="space-y-1">
                  {renderFormattedContent(msg.content, msg.role === 'user')}
                </div>
                
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
          <div ref={bottomRef} />
        </div>
      </div>

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
