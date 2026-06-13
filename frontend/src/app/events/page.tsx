"use client"
import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Layers, Globe, RefreshCw, Sparkles, TrendingUp, CheckCircle, XCircle } from "lucide-react"

interface EventItem {
  id: string
  title: string
  description: string
  status: string
  risk_level: string
  involved_entity_ids: string[] | null
  affected_regions: string[] | null
  last_updated: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [forecastMessage, setForecastMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchEvents = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await fetch("http://localhost:8000/api/v2/events")
      if (res.ok) {
        const data = await res.json()
        setEvents(data)
      } else {
        setErrorMessage("Failed to load events from the API.")
      }
    } catch (e) {
      console.error("Error fetching events", e)
      setErrorMessage("Could not connect to the backend API.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleGenerateForecast = async (eventId: string) => {
    setGeneratingId(eventId)
    setForecastMessage(null)
    setErrorMessage(null)
    try {
      const res = await fetch("http://localhost:8000/api/v2/forecasts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId })
      })
      if (res.ok) {
        const data = await res.json()
        setForecastMessage(`Forecast generated successfully: "${data.prediction || 'Ceasefire negotiated'}"`)
        // Scroll to top to show message
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        const errData = await res.json()
        setErrorMessage(`Forecasting failed: ${errData.detail || "Server error"}`)
      }
    } catch (e) {
      console.error("Error generating forecast", e)
      setErrorMessage("Network error during forecast generation.")
    } finally {
      setGeneratingId(null)
    }
  }

  const getRiskBadge = (level: string) => {
    const l = level.toLowerCase()
    if (l === "critical") return "bg-red-500/10 text-red-500 border border-red-500/20"
    if (l === "high") return "bg-orange-500/10 text-orange-500 border border-orange-500/20"
    if (l === "medium") return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
    return "bg-green-500/10 text-green-500 border border-green-500/20"
  }

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === "escalating") return "bg-red-500/20 text-red-400"
    if (s === "de-escalating") return "bg-green-500/20 text-green-400"
    if (s === "resolved") return "bg-blue-500/20 text-blue-400"
    return "bg-slate-500/20 text-slate-400"
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="text-blue-500 h-8 w-8" /> Geopolitical Event Clusters
          </h1>
          <p className="text-slate-400 mt-1">Automatic discovery of events using HDBSCAN embedding density</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="border-slate-800 text-slate-300 hover:text-white" 
          onClick={fetchEvents}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {forecastMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-start gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white">Success</p>
            <p>{forecastMessage}</p>
            <a href="/forecast" className="text-blue-400 hover:underline font-medium inline-block mt-2">Go to Forecasting Dashboard &rarr;</a>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white">Attention Needed</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <RefreshCw className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" />
          Loading active events...
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-xl text-slate-400">
          <Globe className="h-12 w-12 mx-auto text-slate-600 mb-4" />
          <p className="text-lg font-medium text-slate-200">No active events found</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">Ingest more articles and run clustering to discover events dynamically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="border-slate-800 bg-slate-950/50 backdrop-blur-md hover:border-slate-700 transition duration-300">
              <CardHeader className="space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <Badge className={`${getRiskBadge(event.risk_level)} font-medium`}>
                    {event.risk_level} Risk
                  </Badge>
                  <Badge variant="secondary" className={`${getStatusBadge(event.status)} font-medium capitalize`}>
                    {event.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-white leading-snug mt-2">
                  {event.title}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1">
                  Last Updated: {new Date(event.last_updated).toLocaleString()}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {event.description}
                </p>

                {event.affected_regions && event.affected_regions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Affected Regions</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {event.affected_regions.map((region, idx) => (
                        <Badge key={idx} variant="outline" className="border-slate-800 text-slate-400 text-[11px] py-0">
                          {region}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {event.involved_entity_ids && event.involved_entity_ids.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Involved Entities</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {event.involved_entity_ids.map((entity, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-slate-900 text-slate-300 text-[11px] py-0 border border-slate-800">
                          {entity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
                    onClick={() => handleGenerateForecast(event.id)}
                    disabled={generatingId === event.id}
                  >
                    {generatingId === event.id ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating Predictive Model...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Intelligence Forecast
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
