import type { Scenario, ScenarioNode } from "./types";

/**
 * Sequential traversal engine. Branching is supported at the data level
 * (choices already carry `deltas` and a nextId could be added later),
 * but for the single-arc MVP we step linearly through `scenario.nodes`.
 */
export class ScenarioEngine {
  private idx = 0;
  constructor(public readonly scenario: Scenario) {}

  get current(): ScenarioNode {
    return this.scenario.nodes[this.idx];
  }

  get progress(): { step: number; total: number; ratio: number } {
    const total = this.scenario.nodes.filter(
      (n) => n.kind !== "results"
    ).length;
    const step = Math.min(this.idx + 1, total);
    return { step, total, ratio: step / total };
  }

  next(): ScenarioNode | null {
    if (this.idx >= this.scenario.nodes.length - 1) return null;
    this.idx += 1;
    return this.current;
  }

  isLast(): boolean {
    return this.idx >= this.scenario.nodes.length - 1;
  }

  reset() {
    this.idx = 0;
  }
}

export function findNode(scenario: Scenario, nodeId: string): ScenarioNode | undefined {
  return scenario.nodes.find((n) => n.id === nodeId);
}
