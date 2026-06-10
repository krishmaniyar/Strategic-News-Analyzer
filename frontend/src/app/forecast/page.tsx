import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function ForecastPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Intelligence Forecasts</h1>
        <p className="text-slate-400 mt-1">Predictive analysis with Brier score tracking</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Forecasts List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-md text-muted-foreground">
            Connect to backend /api/v2/forecasts
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
