import { useEffect, useRef } from "react";
import * as d3 from "d3";

export type GraphNode = {
  id: string;
  label: string;
  group: "session" | "scenarioNode" | "trait" | "voiceOutcome" | "choiceCluster";
  value?: number;
  meta?: Record<string, unknown>;
};

export type GraphLink = {
  source: string;
  target: string;
  weight?: number;
  kind?: string;
};

type Props = {
  nodes: GraphNode[];
  links: GraphLink[];
  onSelect: (node: GraphNode | null) => void;
  selectedId: string | null;
};

/**
 * Obsidian-vault-style force-directed graph. Each node group gets a color
 * and a size scale. Dragging is supported. Click any node to open the side
 * panel in the TraitLab page.
 */
export default function ForceGraph({ nodes, links, onSelect, selectedId }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svgEl = ref.current;
    if (!svgEl) return;
    const width = svgEl.clientWidth || 800;
    const height = svgEl.clientHeight || 560;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => g.attr("transform", event.transform.toString()))
    );

    const color: Record<GraphNode["group"], string> = {
      session: "#1a1816",
      scenarioNode: "#d97757",
      trait: "#6b8e7f",
      voiceOutcome: "#c4605a",
      choiceCluster: "#2b3441",
    };
    const radius: Record<GraphNode["group"], number> = {
      session: 9,
      scenarioNode: 7,
      trait: 11,
      voiceOutcome: 9,
      choiceCluster: 8,
    };

    type SimNode = d3.SimulationNodeDatum & GraphNode;
    type SimLink = d3.SimulationLinkDatum<SimNode> & { kind?: string; weight?: number };

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simLinks: SimLink[] = links.map((l) => ({ ...l }));

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => 80 + 40 / ((d.weight ?? 1) + 0.3))
          .strength(0.25)
      )
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<SimNode>().radius((d) => (radius[d.group] ?? 7) + 6)
      );

    const link = g
      .append("g")
      .attr("stroke", "#1a1816")
      .attr("stroke-opacity", 0.12)
      .selectAll("line")
      .data(simLinks)
      .enter()
      .append("line")
      .attr("stroke-width", (d) => 0.8 + Math.min(3, (d.weight ?? 1) * 0.6));

    const node = g
      .append("g")
      .selectAll("g")
      .data(simNodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (_event, d) => {
        onSelect(d as GraphNode);
      });

    node
      .append("circle")
      .attr("r", (d) => radius[d.group] ?? 7)
      .attr("fill", (d) => color[d.group] ?? "#666")
      .attr("stroke", (d) => (d.id === selectedId ? "#d97757" : "#faf7f2"))
      .attr("stroke-width", (d) => (d.id === selectedId ? 3 : 1.5));

    node
      .append("text")
      .text((d) => d.label)
      .attr("x", (d) => (radius[d.group] ?? 7) + 4)
      .attr("y", 4)
      .attr("font-family", "Inter, system-ui, sans-serif")
      .attr("font-size", 10)
      .attr("fill", "#2a2622")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x!)
        .attr("y1", (d) => (d.source as SimNode).y!)
        .attr("x2", (d) => (d.target as SimNode).x!)
        .attr("y2", (d) => (d.target as SimNode).y!);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, onSelect, selectedId]);

  return (
    <svg
      ref={ref}
      className="w-full h-[560px] bg-cream-soft rounded-2xl border border-cream-deep"
    />
  );
}
