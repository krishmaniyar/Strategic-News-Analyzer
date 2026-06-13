"use client"
import { useEffect, useState } from "react"
import { EntityGraph } from "@/components/entities/EntityGraph"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, RefreshCw, HelpCircle } from "lucide-react"
import { EntityGraphData } from "@/types"

interface EntityItem {
  id: string
  name: string
  type: string
  mention_count: number
  global_risk_score: number
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<EntityItem[]>([])
  const [selectedEntityId, setSelectedEntityId] = useState<string>("")
  const [graphData, setGraphData] = useState<EntityGraphData | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingGraph, setLoadingGraph] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch top entities list
  const fetchEntities = async () => {
    setLoadingList(true)
    setErrorMessage(null)
    try {
      const res = await fetch("http://localhost:8000/api/v2/entities?limit=50")
      if (res.ok) {
        const data = await res.json()
        setEntities(data)
        if (data.length > 0) {
          setSelectedEntityId(data[0].id)
        }
      } else {
        setErrorMessage("Failed to load entities list.")
      }
    } catch (e) {
      console.error("Error fetching entities", e)
      setErrorMessage("Could not connect to the backend knowledge graph.")
    } finally {
      setLoadingList(false)
    }
  }

  // Fetch subgraph for selected entity
  const fetchSubgraph = async (entityId: string) => {
    if (!entityId) return
    setLoadingGraph(true)
    try {
      const res = await fetch(`http://localhost:8000/api/v2/entities/${entityId}/graph?hops=2`)
      if (res.ok) {
        const data = await res.json()
        setGraphData(data)
      }
    } catch (e) {
      console.error("Error fetching entity graph", e)
    } finally {
      setLoadingGraph(false)
    }
  }

  useEffect(() => {
    fetchEntities()
  }, [])

  useEffect(() => {
    if (selectedEntityId) {
      fetchSubgraph(selectedEntityId)
    }
  }, [selectedEntityId])

  const selectedEntity = entities.find(e => e.id === selectedEntityId)

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Shield className="text-blue-500 h-8 w-8" /> Geopolitical Knowledge Graph
        </h1>
        <p className="text-slate-400 mt-1">Traversing entity relationships extracted from multi-source intelligence briefings</p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Selector */}
        <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-400" /> Tracked Entities
            </CardTitle>
            <CardDescription className="text-xs">
              Select an entity to map relationships
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingList ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                <RefreshCw className="animate-spin h-5 w-5 mx-auto mb-2 text-blue-500" />
                Loading entities...
              </div>
            ) : entities.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm px-4">
                No entities found. Start ingestion to automatically extract nodes from articles.
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-900 border-t border-slate-900">
                {entities.map((ent) => (
                  <button
                    key={ent.id}
                    className={`w-full text-left px-4 py-3 text-xs flex justify-between items-center transition-all ${
                      selectedEntityId === ent.id
                        ? "bg-blue-600/10 text-blue-400 font-semibold border-l-2 border-blue-500"
                        : "text-slate-400 hover:bg-slate-900/50 hover:text-white"
                    }`}
                    onClick={() => setSelectedEntityId(ent.id)}
                  >
                    <div className="truncate pr-2">
                      <p className="font-medium text-slate-200">{ent.name}</p>
                      <span className="text-[10px] text-slate-500">{ent.type}</span>
                    </div>
                    <Badge variant="outline" className="border-slate-800 text-slate-500 text-[10px] py-0 px-1.5 font-normal">
                      {ent.mention_count}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Graph Display */}
        <Card className="lg:col-span-3 border-slate-800 bg-slate-950/40 backdrop-blur-md flex flex-col min-h-[500px]">
          <CardHeader className="border-b border-slate-900 flex flex-row justify-between items-center py-4">
            <div>
              <CardTitle className="text-lg font-bold text-white">
                {selectedEntity ? `${selectedEntity.name} Subgraph` : "Relationship Canvas"}
              </CardTitle>
              {selectedEntity && (
                <CardDescription className="text-xs mt-0.5">
                  Type: {selectedEntity.type} • Mentions: {selectedEntity.mention_count} • Risk Score: {selectedEntity.global_risk_score}
                </CardDescription>
              )}
            </div>
            {loadingGraph && (
              <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/5 py-0.5 flex items-center">
                <RefreshCw className="animate-spin h-3 w-3 mr-1" />
                Mapping nodes...
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0 flex-1 relative bg-slate-950/20">
            {graphData && graphData.nodes && graphData.nodes.length > 0 ? (
              <div className="h-[520px] w-full relative">
                <EntityGraph data={graphData} />
              </div>
            ) : (
              <div className="h-[520px] flex flex-col items-center justify-center text-slate-500 text-sm p-4 text-center">
                <HelpCircle className="h-10 w-10 text-slate-700 mb-2" />
                No relationship subgraph found for this node.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
