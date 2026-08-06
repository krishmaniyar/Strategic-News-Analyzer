"use client"
import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api"
import { EntityGraph } from "@/components/entities/EntityGraph"
import { GitGraph, Users, RefreshCw, AlertCircle, Search, TrendingUp } from "lucide-react"
import { EntityGraphData } from "@/types"

interface EntityItem {
  id: string
  name: string
  type: string
  mention_count: number
  global_risk_score: number
}

const TYPE_COLORS: Record<string, string> = {
  Country:      "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Person:       "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Organization: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Event:        "text-red-400 bg-red-400/10 border-red-400/20",
  Technology:   "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  Other:        "text-slate-400 bg-slate-400/10 border-slate-400/20",
}

function typeColor(t: string) {
  return TYPE_COLORS[t] || TYPE_COLORS.Other
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<EntityItem[]>([])
  const [selectedEntityId, setSelectedEntityId] = useState<string>("")
  const [graphData, setGraphData] = useState<EntityGraphData | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingGraph, setLoadingGraph] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const fetchEntities = async () => {
    setLoadingList(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/entities?limit=50`)
      if (res.ok) {
        const data = await res.json()
        setEntities(data)
        if (data.length > 0) setSelectedEntityId(data[0].id)
      } else {
        setError("Failed to load entities.")
      }
    } catch {
      setError("Could not connect to the backend knowledge graph.")
    } finally {
      setLoadingList(false)
    }
  }

  const fetchSubgraph = async (entityId: string) => {
    if (!entityId) return
    setLoadingGraph(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/entities/${entityId}/graph?hops=2`)
      if (res.ok) setGraphData(await res.json())
    } catch {}
    finally { setLoadingGraph(false) }
  }

  useEffect(() => { fetchEntities() }, [])
  useEffect(() => { if (selectedEntityId) fetchSubgraph(selectedEntityId) }, [selectedEntityId])

  const selectedEntity = entities.find(e => e.id === selectedEntityId)
  const filtered = entities.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between fade-up">
        <div>
          <p className="page-header-tag mb-1">// GRAPH — KNOWLEDGE NETWORK</p>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Geopolitical Knowledge Graph
          </h1>
          <p className="text-sm text-slate-600 mt-1">Entity relationships extracted from multi-source intelligence</p>
        </div>
        <button onClick={fetchEntities} disabled={loadingList}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-400 hover:text-slate-200 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/[0.06] border border-red-500/20 fade-up">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-[12px] text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Entity list sidebar */}
        <div className="intel-card overflow-hidden fade-up fade-up-delay-1">
          <div className="p-3 border-b border-white/[0.05]">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[12px] font-semibold text-slate-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Tracked Entities
              </span>
              <span className="ml-auto text-[10px] font-mono text-slate-600">{entities.length}</span>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search entities..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>
          </div>

          {loadingList ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-11 rounded-lg" />)}
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto p-2 space-y-1">
              {filtered.map((ent) => (
                <button key={ent.id}
                  onClick={() => setSelectedEntityId(ent.id)}
                  className={`entity-card w-full text-left px-3 py-2.5 ${selectedEntityId === ent.id ? "selected" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-slate-200 truncate"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {ent.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${typeColor(ent.type)}`}>
                          {ent.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span className="stat-number text-[13px] font-bold text-slate-300">{ent.mention_count}</span>
                      <span className="text-[8px] text-slate-700 font-mono">mentions</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Graph canvas */}
        <div className="lg:col-span-3 intel-card overflow-hidden flex flex-col fade-up fade-up-delay-2" style={{ minHeight: 540 }}>
          {/* Graph header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <GitGraph className="w-4 h-4 text-blue-400" />
                <span className="text-[13px] font-semibold text-slate-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {selectedEntity ? `${selectedEntity.name} — Relationship Subgraph` : "Select an entity"}
                </span>
              </div>
              {selectedEntity && (
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${typeColor(selectedEntity.type)}`}>
                    {selectedEntity.type}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">
                    {selectedEntity.mention_count} mentions
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">
                    Risk Score: {selectedEntity.global_risk_score.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            {loadingGraph && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-blue-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Mapping nodes...
              </div>
            )}
          </div>

          {/* Graph body */}
          <div className="flex-1 relative bg-[#04040e] scanlines">
            {graphData && graphData.nodes && graphData.nodes.length > 0 ? (
              <div className="h-[500px] w-full">
                <EntityGraph data={graphData} />
              </div>
            ) : (
              <div className="h-[500px] flex flex-col items-center justify-center text-center p-8">
                <TrendingUp className="w-10 h-10 text-slate-800 mb-3" />
                <p className="text-slate-500 text-sm font-medium">No relationship graph found</p>
                <p className="text-slate-700 text-xs mt-1">Select an entity with connections to visualize the network</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
