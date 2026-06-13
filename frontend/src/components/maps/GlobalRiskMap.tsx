"use client"
import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { feature } from "topojson-client"

interface CountryRiskData {
  risk: string
  score: number
  article_count: number
  avg_sentiment: number
  avg_strategic: number
  max_risk: string
}

interface GlobalRiskMapProps {
  riskData: Record<string, CountryRiskData>
  selectedCountry: string | null
  onCountryClick: (countryName: string, data: CountryRiskData | null) => void
}

/* ── Continuous color scale from score 0→1 ── */
const RISK_COLOR_SCALE = d3.scaleLinear<string>()
  .domain([0, 0.25, 0.45, 0.65, 1.0])
  .range(["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"])
  .clamp(true)

const RISK_TIER_COLOR: Record<string, string> = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Critical: "#ef4444",
}

/* ── Name aliases: TopoJSON name → our DB canonical name ── */
const TOPO_TO_DB_NAME: Record<string, string> = {
  "United States of America": "United States of America",
  "United Kingdom": "United Kingdom",
  "Dem. Rep. Congo": "Dem. Rep. Congo",
  "Bosnia and Herz.": "Bosnia and Herz.",
  "Dominican Rep.": "Dominican Rep.",
  "S. Sudan": "South Sudan",
  "Central African Rep.": "Central African Rep.",
  "Côte d'Ivoire": "Ivory Coast",
  "Czech Republic": "Czechia",
  "Republic of the Congo": "Republic of Congo",
  "eSwatini": "Eswatini",
  "N. Cyprus": "Northern Cyprus",
  "Somaliland": "Somaliland",
  "W. Sahara": "Western Sahara",
}

export function GlobalRiskMap({ riskData, selectedCountry, onCountryClick }: GlobalRiskMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [legendVisible] = useState(true)

  useEffect(() => {
    if (!svgRef.current) return

    const width = 960, height = 500
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)

    const projection = d3.geoNaturalEarth1()
      .scale(160).translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    svg.selectAll("*").remove()

    // Ocean background
    svg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "#0f172a")
      .attr("rx", 12)

    // Graticule (lat/lon grid)
    const graticule = d3.geoGraticule()
    svg.append("path")
      .datum(graticule())
      .attr("d", path as any)
      .attr("fill", "none")
      .attr("stroke", "rgba(148, 163, 184, 0.08)")
      .attr("stroke-width", 0.5)

    const tooltip = d3.select(tooltipRef.current)

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((world: any) => {
        const countries = feature(world, world.objects.countries) as any

        svg.selectAll("path.country")
          .data(countries.features)
          .join("path")
          .attr("class", "country")
          .attr("d", path as any)
          .attr("fill", (d: any) => {
            const topoName = d.properties?.name
            // Try direct match, then alias
            const dbName = TOPO_TO_DB_NAME[topoName] || topoName
            const data = riskData[dbName] || riskData[topoName]
            if (data) {
              return RISK_COLOR_SCALE(data.score)
            }
            return "#1e293b" // Dark slate for uncolored
          })
          .attr("stroke", (d: any) => {
            const topoName = d.properties?.name
            const dbName = TOPO_TO_DB_NAME[topoName] || topoName
            const isSelected = selectedCountry && (dbName === selectedCountry || topoName === selectedCountry)
            return isSelected ? "#38bdf8" : "rgba(148, 163, 184, 0.25)"
          })
          .attr("stroke-width", (d: any) => {
            const topoName = d.properties?.name
            const dbName = TOPO_TO_DB_NAME[topoName] || topoName
            const isSelected = selectedCountry && (dbName === selectedCountry || topoName === selectedCountry)
            return isSelected ? 2.5 : 0.5
          })
          .style("cursor", "pointer")
          .style("transition", "fill 0.2s ease")
          .on("mouseenter", function(event: MouseEvent, d: any) {
            const topoName = d.properties?.name
            const dbName = TOPO_TO_DB_NAME[topoName] || topoName
            const data = riskData[dbName] || riskData[topoName]

            d3.select(this)
              .attr("stroke-width", 2)
              .attr("stroke", "#38bdf8")
              .raise()

            if (data) {
              tooltip
                .style("opacity", 1)
                .style("left", `${event.offsetX + 12}px`)
                .style("top", `${event.offsetY - 10}px`)
                .html(`
                  <div class="font-semibold text-sm mb-1">${topoName}</div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="inline-block w-2 h-2 rounded-full" style="background:${RISK_TIER_COLOR[data.risk] || '#64748b'}"></span>
                    <span class="text-xs font-medium">${data.risk} Risk</span>
                    <span class="text-xs text-slate-400">(${(data.score * 100).toFixed(0)}%)</span>
                  </div>
                  <div class="text-xs text-slate-400">${data.article_count} article${data.article_count !== 1 ? 's' : ''}</div>
                  <div class="text-xs text-slate-400">Sentiment: ${data.avg_sentiment > 0 ? '+' : ''}${data.avg_sentiment.toFixed(2)}</div>
                `)
            } else {
              tooltip
                .style("opacity", 1)
                .style("left", `${event.offsetX + 12}px`)
                .style("top", `${event.offsetY - 10}px`)
                .html(`<div class="font-semibold text-sm">${topoName}</div><div class="text-xs text-slate-500">No data</div>`)
            }
          })
          .on("mousemove", function(event: MouseEvent) {
            tooltip
              .style("left", `${event.offsetX + 12}px`)
              .style("top", `${event.offsetY - 10}px`)
          })
          .on("mouseleave", function(_, d: any) {
            const topoName = d.properties?.name
            const dbName = TOPO_TO_DB_NAME[topoName] || topoName
            const isSelected = selectedCountry && (dbName === selectedCountry || topoName === selectedCountry)
            const data = riskData[dbName] || riskData[topoName]

            d3.select(this)
              .attr("stroke-width", isSelected ? 2.5 : 0.5)
              .attr("stroke", isSelected ? "#38bdf8" : "rgba(148, 163, 184, 0.25)")

            tooltip.style("opacity", 0)
          })
          .on("click", (_, d: any) => {
            const topoName = d.properties?.name
            const dbName = TOPO_TO_DB_NAME[topoName] || topoName
            const data = riskData[dbName] || riskData[topoName] || null
            onCountryClick(dbName, data)
          })

        // === Legend ===
        if (legendVisible) {
          const legendG = svg.append("g")
            .attr("transform", `translate(20, ${height - 65})`)

          // Background
          legendG.append("rect")
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", 200)
            .attr("height", 55)
            .attr("rx", 6)
            .attr("fill", "rgba(15, 23, 42, 0.85)")
            .attr("stroke", "rgba(148, 163, 184, 0.15)")

          const tiers = [
            { label: "Low", color: "#22c55e" },
            { label: "Medium", color: "#eab308" },
            { label: "High", color: "#f97316" },
            { label: "Critical", color: "#ef4444" },
          ]

          legendG.append("text")
            .attr("x", 0)
            .attr("y", 8)
            .attr("fill", "#94a3b8")
            .attr("font-size", "9px")
            .attr("font-weight", "600")
            .attr("letter-spacing", "0.05em")
            .text("RISK LEVEL")

          tiers.forEach((tier, i) => {
            const x = i * 46
            legendG.append("rect")
              .attr("x", x)
              .attr("y", 18)
              .attr("width", 38)
              .attr("height", 10)
              .attr("rx", 3)
              .attr("fill", tier.color)
              .attr("opacity", 0.85)

            legendG.append("text")
              .attr("x", x + 19)
              .attr("y", 40)
              .attr("fill", "#cbd5e1")
              .attr("font-size", "8px")
              .attr("text-anchor", "middle")
              .text(tier.label)
          })
        }
      })
  }, [riskData, selectedCountry, legendVisible, onCountryClick])

  return (
    <div className="w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner relative">
      <svg ref={svgRef} className="w-full h-full" />
      {/* Floating tooltip */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2 shadow-xl z-50"
        style={{ opacity: 0, transition: "opacity 0.15s ease" }}
      />
    </div>
  )
}
