import { EntityGraph } from "@/components/entities/EntityGraph"
import { EntityGraphData } from "@/types"

export default function EntitiesPage() {
  // Mock data for the graph
  const mockData: EntityGraphData = {
    nodes: [
      { id: "1", name: "United States", type: "Country", mention_count: 150, global_risk_score: 50, depth: 0, description: "" },
      { id: "2", name: "China", type: "Country", mention_count: 120, global_risk_score: 60, depth: 1, description: "" },
      { id: "3", name: "Taiwan", type: "Country", mention_count: 80, global_risk_score: 80, depth: 1, description: "" },
    ],
    edges: [
      { from_entity_id: "1", to_entity_id: "2", relation_type: "Trade War", confidence: 0.9 },
      { from_entity_id: "2", to_entity_id: "3", relation_type: "Territorial Dispute", confidence: 0.95 },
      { from_entity_id: "1", to_entity_id: "3", relation_type: "Defense Pact", confidence: 0.85 },
    ]
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Graph</h1>
        <p className="text-slate-400 mt-1">Force-directed relationships between geopolitical entities</p>
      </div>
      
      <div className="h-[600px] border shadow-sm rounded-xl overflow-hidden">
        <EntityGraph data={mockData} />
      </div>
    </div>
  )
}
