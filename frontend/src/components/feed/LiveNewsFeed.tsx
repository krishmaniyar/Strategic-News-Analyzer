"use client"
import { useEffect, useState } from "react"
import { API_BASE_URL, WS_BASE_URL } from "@/lib/api"
import { useRealtimeStore } from "@/store/realtime"
import { Article } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RISK_COLORS } from "@/types"

export function ArticleCard({ article, isNew = false }: { article: Article, isNew?: boolean }) {
  const risk = article.analysis?.risk_level || "Unknown"
  const riskClass = RISK_COLORS[risk] || "bg-slate-100 text-slate-800"

  return (
    <Card className={`transition-all duration-500 ${isNew ? 'border-blue-400 shadow-md scale-[1.01]' : 'border-border'}`}>
      <CardHeader className="py-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold leading-tight">
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {article.title}
            </a>
          </CardTitle>
          {isNew && <Badge variant="secondary" className="bg-blue-100 text-blue-800 animate-pulse shrink-0 ml-2">New</Badge>}
        </div>
        <CardDescription className="text-xs flex items-center space-x-2 mt-1">
          <span className="font-medium text-slate-700 dark:text-slate-300">{article.source_name}</span>
          <span>•</span>
          <span>{new Date(article.published_at || article.created_at).toLocaleString()}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="py-0 pb-3 space-y-2">
        <div className="flex gap-2 flex-wrap mt-2">
          {article.analysis && (
            <>
              <Badge className={riskClass} variant="outline">
                {risk} Risk
              </Badge>
              {article.analysis.sentiment_label && (
                <Badge variant="outline">{article.analysis.sentiment_label}</Badge>
              )}
            </>
          )}
        </div>
        {article.analysis?.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {article.analysis.summary}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function LiveNewsFeed({ region }: { region?: string }) {
  const { liveArticles, addArticle, setConnectionStatus, connectionStatus } = useRealtimeStore()
  const [historical, setHistorical] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Connect WebSocket
    const ws = new WebSocket(`${WS_BASE_URL}/ws/feed`)
    
    ws.onopen = () => setConnectionStatus("connected")
    ws.onclose = () => setConnectionStatus("disconnected")
    ws.onerror = () => setConnectionStatus("disconnected")

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "new_article") {
          addArticle(data.data as Article)
        }
      } catch (e) {
        console.error("Failed to parse websocket message", e)
      }
    }

    return () => {
      ws.close()
    }
  }, [addArticle, setConnectionStatus])

  useEffect(() => {
    // Fetch historical articles via React Query (here using fetch directly for simplicity)
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const url = region ? `/api/v2/articles?region=${encodeURIComponent(region)}` : `/api/v2/articles`
        // In real app, proxy via Next.js or use full backend URL
        const res = await fetch(`${API_BASE_URL}${url}`)
        if (res.ok) {
          const data = await res.json()
          setHistorical(data.articles || [])
        }
      } catch (e) {
        console.error("Failed to fetch history", e)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [region])

  // Optional: clear new status after a few seconds? For now we just show liveArticles as 'isNew'
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="font-semibold text-lg flex items-center">
          Live Feed 
          {region && <span className="ml-2 text-muted-foreground text-sm font-normal">({region})</span>}
        </h3>
        <div className="flex items-center text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full mr-2 ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
          {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="space-y-3">
        {liveArticles.map(article => (
          <ArticleCard key={`live-${article.id}`} article={article} isNew />
        ))}
        
        {loading && <div className="text-center text-sm py-4">Loading history...</div>}
        
        {historical.map(article => (
          <ArticleCard key={`hist-${article.id}`} article={article} />
        ))}
        
        {!loading && historical.length === 0 && liveArticles.length === 0 && (
          <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg">
            No articles found for this region.
          </div>
        )}
      </div>
    </div>
  )
}
