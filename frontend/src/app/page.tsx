import { GlobalRiskMap } from "@/components/maps/GlobalRiskMap"
import { AIAnalystChat } from "@/components/analyst/AIAnalystChat"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function Home() {
  // Dummy data for the map to show functionality immediately
  const riskData = {
    "Russia": "Critical",
    "Ukraine": "Critical",
    "Israel": "High",
    "China": "Medium",
    "United States": "Low",
    "Iran": "High"
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Global Risk Overview</h1>
        <p className="text-slate-400 mt-1">Real-time geopolitical threat assessment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader>
            <CardTitle>Geopolitical Risk Map</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[450px]">
            <GlobalRiskMap riskData={riskData} />
          </CardContent>
        </Card>

        <div className="h-[520px]">
          <AIAnalystChat />
        </div>
      </div>
    </div>
  )
}
