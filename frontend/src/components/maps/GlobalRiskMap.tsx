"use client"
import { useEffect, useRef } from "react"
import * as d3 from "d3"
import { feature } from "topojson-client"

const RISK_SCALE = d3.scaleOrdinal<string>()
  .domain(["Low", "Medium", "High", "Critical"])
  .range(["#22c55e", "#eab308", "#f97316", "#ef4444"])

export function GlobalRiskMap({ riskData }: { riskData: Record<string, string> }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const width = 960, height = 500
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)

    const projection = d3.geoNaturalEarth1()
      .scale(160).translate([width / 2, height / 2])

    const path = d3.geoPath().projection(projection)

    // Clear previous renders
    svg.selectAll("*").remove()

    // Add a background rect
    svg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "transparent")

    // Fetch world topology (using unpkg CDN)
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((world: any) => {
        const countries = feature(world, world.objects.countries) as any

        svg.selectAll("path")
          .data(countries.features)
          .join("path")
          .attr("d", path as any)
          .attr("fill", (d: any) => {
            const countryName = d.properties?.name
            const risk = riskData[countryName]
            return risk ? RISK_SCALE(risk) : "#e5e7eb" // Default gray
          })
          .attr("stroke", "#9ca3af")
          .attr("stroke-width", 0.5)
          .on("mouseenter", function() {
             d3.select(this).attr("stroke-width", 1.5).attr("stroke", "#1f2937")
          })
          .on("mouseleave", function() {
             d3.select(this).attr("stroke-width", 0.5).attr("stroke", "#9ca3af")
          })
          .on("click", (_, d: any) => {
            // Navigate to /feed?region=<country_name>
            window.location.href = `/feed?region=${encodeURIComponent(d.properties?.name)}`
          })
          
          // Add tooltips
          .append("title")
          .text((d: any) => {
             const name = d.properties?.name
             const risk = riskData[name]
             return risk ? `${name}: ${risk} Risk` : name
          })
      })
  }, [riskData])

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden border shadow-inner">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}
