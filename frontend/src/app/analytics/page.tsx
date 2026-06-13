"use client"
import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { ShieldAlert, TrendingUp, RefreshCw, BarChart2 } from "lucide-react"

// Mock data showing simulated geopolitical risk and sentiment levels over time
const mockData = [
  { name: 'Jan', risk: 40, sentiment: -10, articles: 25 },
  { name: 'Feb', risk: 30, sentiment: 5, articles: 32 },
  { name: 'Mar', risk: 45, sentiment: -20, articles: 40 },
  { name: 'Apr', risk: 60, sentiment: -40, articles: 55 },
  { name: 'May', risk: 55, sentiment: -15, articles: 48 },
  { name: 'Jun', risk: 70, sentiment: -50, articles: 72 },
  { name: 'Jul', risk: 85, sentiment: -60, articles: 90 },
]

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 px-4 py-6 text-center text-slate-400">
        <RefreshCw className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" />
        Loading analytics engine...
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <BarChart2 className="text-blue-500 h-8 w-8" /> System Analytics
        </h1>
        <p className="text-slate-400 mt-1">Longitudinal intelligence metrics and risk distribution trends</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Level Trend */}
        <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-red-500" /> Geopolitical Risk Index
            </CardTitle>
            <CardDescription className="text-xs">
              Aggregate threat scoring based on strategic risk analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff", borderRadius: "8px" }}
                />
                <Line type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: "#ef4444" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sentiment Score Trend */}
        <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-400" /> Editorial Sentiment Curve
            </CardTitle>
            <CardDescription className="text-xs">
              Longitudinal sentiment drift (negative vs positive)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff", borderRadius: "8px" }}
                />
                <Line type="monotone" dataKey="sentiment" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: "#3b82f6" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Volume of articles analyzed */}
        <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white">Ingestion Volume</CardTitle>
            <CardDescription className="text-xs">
              Total strategic documents analyzed and indexed per month
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff", borderRadius: "8px" }}
                />
                <Bar dataKey="articles" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
