"use client"
import { useEffect, useRef } from "react"
import * as d3 from "d3"
import { EntityGraphData } from "@/types"

export function EntityGraph({ data }: { data: EntityGraphData }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes || !data.edges) return

    const width = 800
    const height = 600

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
    
    svg.selectAll("*").remove()

    // Add zoom capability
    const g = svg.append("g")
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })
    svg.call(zoom)

    // Setup simulation
    // Nodes need to be cloned for d3
    const nodes = data.nodes.map(d => ({ ...d })) as any[]
    const links = data.edges.map(d => ({ ...d, source: d.from_entity_id, target: d.to_entity_id })) as any[]

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => Math.max(10, Math.sqrt(d.mention_count || 1) * 3) + 2))

    // Edges
    const link = g.append("g")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d: any) => Math.max(1, (d.confidence || 0.5) * 5))

    // Color scale by entity type
    const color = d3.scaleOrdinal(d3.schemeCategory10)

    // Nodes
    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d: any) => Math.max(5, Math.sqrt(d.mention_count || 1) * 3))
      .attr("fill", (d: any) => color(d.type || "Unknown"))
      .call(drag(simulation) as any)

    // Node labels
    const labels = g.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d: any) => d.name)
      .attr("font-size", 10)
      .attr("dx", 12)
      .attr("dy", 4)
      .attr("fill", "currentColor")
      .attr("stroke", "none")

    // Tooltips
    node.append("title")
      .text((d: any) => `${d.name}\nType: ${d.type}\nMentions: ${d.mention_count}`)

    link.append("title")
      .text((d: any) => `${d.relation_type}\nConfidence: ${d.confidence?.toFixed(2) || "N/A"}`)

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y)

      labels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y)
    })

    function drag(simulation: d3.Simulation<any, any>) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
      }
      
      function dragged(event: any) {
        event.subject.fx = event.x
        event.subject.fy = event.y
      }
      
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0)
        event.subject.fx = null
        event.subject.fy = null
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    }

    return () => {
      simulation.stop()
    }
  }, [data])

  return (
    <div className="w-full h-full min-h-[400px] border rounded-lg bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <svg ref={svgRef} className="w-full h-full text-slate-800 dark:text-slate-200" />
    </div>
  )
}
