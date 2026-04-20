import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSessionSummaries } from "../lib/convexClient";
import { TRAITS, TRAIT_ORDER, type TraitKey } from "../lib/traits/model";
import { launchDayTangle } from "../data/tangles/launchDay";
import ForceGraph, { type GraphNode, type GraphLink } from "../components/traitlab/ForceGraph";
import { cn, formatDuration } from "../lib/utils";
import { ArrowLeft, Phone, PhoneOff, PhoneMissed, PenLine, Circle } from "lucide-react";

/**
 * A summary row as returned by `api.sessions.listSummaries`.
 * Typed loosely so we don't duplicate the Convex Doc types here.
 */
type Summary = {
  session: {
    _id: string;
    guestName: string;
    scoringModelVersion: string;
    startedAt: number;
    completedAt?: number;
    nodesVisited: string[];
  };
  choices: Array<{ nodeId: string; choiceId: string; label: string; hesitationMs: number }>;
  freeTexts: Array<{ nodeId: string; text: string }>;
  voice: {
    status: string;
    usedVoice: boolean;
    derivedSignals?: { hedging: number } | null;
  } | null;
  artifact: {
    _id: string;
    headline: string;
    traitScores: Record<string, number>;
    confidence: number;
    scoringModelVersion: string;
  } | null;
};

type VoiceStatus = "answered" | "declined" | "fallback_typed" | "missed" | "failed" | "not_started";

export default function TraitLab() {
  const rawSummaries = useSessionSummaries();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [scoringVersionFilter, setScoringVersionFilter] = useState<string>("all");

  const summaries: Summary[] = (rawSummaries ?? []) as unknown as Summary[];

  const filtered = useMemo(
    () =>
      scoringVersionFilter === "all"
        ? summaries
        : summaries.filter((s) => s.session.scoringModelVersion === scoringVersionFilter),
    [summaries, scoringVersionFilter]
  );

  const graph = useMemo(() => buildGraph(filtered), [filtered]);
  const separation = useMemo(() => computeSeparation(filtered), [filtered]);

  const completionRate = useMemo(() => {
    if (summaries.length === 0) return 0;
    return summaries.filter((s) => s.session.completedAt).length / summaries.length;
  }, [summaries]);

  const voiceRates = useMemo(() => {
    const counts = { answered: 0, declined: 0, fallback: 0, missed: 0, failed: 0, none: 0 };
    for (const s of summaries) {
      const st = (s.voice?.status ?? "not_started") as VoiceStatus;
      if (st === "answered") counts.answered++;
      else if (st === "declined") counts.declined++;
      else if (st === "fallback_typed") counts.fallback++;
      else if (st === "missed") counts.missed++;
      else if (st === "failed") counts.failed++;
      else counts.none++;
    }
    return counts;
  }, [summaries]);

  const scoringVersions = useMemo(
    () => Array.from(new Set(summaries.map((s) => s.session.scoringModelVersion))),
    [summaries]
  );

  if (rawSummaries === undefined) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ink/20 border-t-ink animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-cream text-ink">
      <div className="border-b border-cream-deep sticky top-0 z-20 bg-cream/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-ink-muted">internal</p>
            <h1 className="font-display text-2xl text-ink">Trait Lab Lite</h1>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
            <ArrowLeft className="w-4 h-4" />
            back
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-8 space-y-10">
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="sessions" value={summaries.length} />
          <Stat label="completion" value={`${Math.round(completionRate * 100)}%`} />
          <Stat label="voice answered" value={voiceRates.answered} />
          <Stat label="voice fallback" value={voiceRates.fallback} />
          <Stat label="voice declined" value={voiceRates.declined} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl">Sessions</h2>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-ink-muted">scoring version</label>
              <select
                value={scoringVersionFilter}
                onChange={(e) => setScoringVersionFilter(e.target.value)}
                className="rounded border border-cream-deep bg-white px-2 py-1 text-xs"
              >
                <option value="all">all</option>
                {scoringVersions.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <SessionTable summaries={filtered} />
        </section>

        <section>
          <h2 className="font-display text-xl mb-1">Signal quality</h2>
          <p className="text-sm text-ink-muted mb-3">
            Nodes ranked by how much they separate users (entropy of choice distributions).
          </p>
          <div className="rounded-2xl bg-white border border-cream-deep overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-soft text-[11px] uppercase tracking-widest text-ink-muted">
                <tr>
                  <th className="text-left px-4 py-2">node</th>
                  <th className="text-left px-4 py-2">kind</th>
                  <th className="text-right px-4 py-2">picks</th>
                  <th className="text-right px-4 py-2">spread</th>
                  <th className="text-right px-4 py-2">median hesitation</th>
                </tr>
              </thead>
              <tbody>
                {separation.map((row) => (
                  <tr key={row.nodeId} className="border-t border-cream-deep">
                    <td className="px-4 py-2 font-medium">{row.title}</td>
                    <td className="px-4 py-2 text-ink-muted">{row.kind}</td>
                    <td className="px-4 py-2 text-right font-mono">{row.count}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      <span className={cn(row.spread >= 1.5 && "text-accent-ember font-medium", row.spread < 0.6 && "text-ink-muted")}>
                        {row.spread.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-ink-muted">
                      {row.medianHesitation > 0 ? formatDuration(row.medianHesitation) : "—"}
                    </td>
                  </tr>
                ))}
                {separation.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-ink-muted italic">
                      no sessions yet — run the Tangle to populate this view
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl mb-1">Vault view</h2>
          <p className="text-sm text-ink-muted mb-3">
            Sessions, traits, scenario nodes, and voice outcomes as nodes. Click any node to inspect.
          </p>
          <div className="grid md:grid-cols-[1fr_280px] gap-4">
            <div className="rounded-2xl overflow-hidden border border-cream-deep">
              <ForceGraph
                nodes={graph.nodes}
                links={graph.links}
                selectedId={selectedNode?.id ?? null}
                onSelect={setSelectedNode}
              />
            </div>
            <aside className="rounded-2xl bg-white border border-cream-deep p-4 card-shadow min-h-[200px]">
              {selectedNode ? (
                <NodePanel node={selectedNode} summaries={filtered} onClear={() => setSelectedNode(null)} />
              ) : (
                <div className="flex flex-col gap-3 text-sm text-ink-muted">
                  <p className="uppercase text-[10px] tracking-widest">legend</p>
                  <Legend color="bg-ink" label="session (one user)" />
                  <Legend color="bg-accent-ember" label="scenario node" />
                  <Legend color="bg-accent-sage" label="trait dimension" />
                  <Legend color="bg-accent-rose" label="voice outcome" />
                  <Legend color="bg-accent-ink" label="choice cluster" />
                  <p className="mt-4 text-ink-muted text-xs italic leading-snug">
                    Click a node to inspect. Drag to pull them apart.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white border border-cream-deep p-4">
      <p className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</p>
      <p className="font-display text-3xl mt-1">{value}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-3 h-3 rounded-full", color)} />
      <span className="text-xs text-ink">{label}</span>
    </div>
  );
}

function VoiceBadge({ status }: { status: string }) {
  const map: Record<string, { Icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
    answered: { Icon: Phone, label: "answered", color: "text-accent-sage" },
    fallback_typed: { Icon: PenLine, label: "typed", color: "text-ink" },
    declined: { Icon: PhoneOff, label: "declined", color: "text-accent-rose" },
    missed: { Icon: PhoneMissed, label: "missed", color: "text-ink-muted" },
    failed: { Icon: PhoneOff, label: "failed", color: "text-accent-rose" },
    not_started: { Icon: Circle, label: "—", color: "text-ink-muted" },
  };
  const m = map[status] ?? map.not_started;
  const Icon = m.Icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", m.color)}>
      <Icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}

function SessionTable({ summaries }: { summaries: Summary[] }) {
  if (summaries.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-cream-deep p-10 text-center text-ink-muted">
        No sessions yet.{" "}
        <Link to="/play" className="underline">Play one</Link> to seed the lab.
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white border border-cream-deep overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-cream-soft text-[11px] uppercase tracking-widest text-ink-muted">
          <tr>
            <th className="text-left px-4 py-2">session</th>
            <th className="text-left px-4 py-2">guest</th>
            <th className="text-left px-4 py-2">voice</th>
            <th className="text-right px-4 py-2">choices</th>
            <th className="text-right px-4 py-2">text len</th>
            <th className="text-left px-4 py-2">top trait</th>
            <th className="text-right px-4 py-2">conf</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {summaries.map(({ session, choices, freeTexts, voice, artifact }) => {
            const topTraitKey = artifact
              ? Object.entries(artifact.traitScores).sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))[0]
              : null;
            const textLen = freeTexts.reduce((acc, f) => acc + (f.text?.length ?? 0), 0);
            return (
              <tr key={session._id} className="border-t border-cream-deep hover:bg-cream-soft/40">
                <td className="px-4 py-2 font-mono text-xs text-ink-muted">{session._id.slice(-6)}</td>
                <td className="px-4 py-2">{session.guestName || "—"}</td>
                <td className="px-4 py-2"><VoiceBadge status={voice?.status ?? "not_started"} /></td>
                <td className="px-4 py-2 text-right font-mono">{choices.length}</td>
                <td className="px-4 py-2 text-right font-mono">{textLen}</td>
                <td className="px-4 py-2">
                  {topTraitKey
                    ? `${TRAITS[topTraitKey[0] as TraitKey]?.label ?? topTraitKey[0]} ${Math.round(topTraitKey[1])}`
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  {artifact ? `${Math.round(artifact.confidence * 100)}%` : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  {artifact && (
                    <Link to={`/results/${session._id}`} className="text-xs text-ink-muted underline">open</Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NodePanel({
  node,
  summaries,
  onClear,
}: {
  node: GraphNode;
  summaries: Summary[];
  onClear: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-ink-muted">{node.group}</p>
          <p className="font-display text-lg leading-tight">{node.label}</p>
        </div>
        <button onClick={onClear} className="text-xs text-ink-muted underline">clear</button>
      </div>
      {node.group === "trait" && <TraitDetail traitKey={node.id.replace("trait:", "") as TraitKey} summaries={summaries} />}
      {node.group === "session" && <SessionDetail sessionId={node.id.replace("session:", "")} summaries={summaries} />}
      {node.group === "scenarioNode" && <ScenarioNodeDetail nodeId={node.id.replace("node:", "")} summaries={summaries} />}
      {node.group === "voiceOutcome" && <VoiceOutcomeDetail outcome={node.id.replace("voice:", "")} summaries={summaries} />}
    </div>
  );
}

function TraitDetail({ traitKey, summaries }: { traitKey: TraitKey; summaries: Summary[] }) {
  const t = TRAITS[traitKey];
  const scores = summaries.filter((s) => s.artifact).map((s) => (s.artifact!.traitScores as Record<string, number>)[traitKey] ?? 50);
  const mean = scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length;
  return (
    <div className="space-y-2 text-sm">
      <p className="text-ink-muted">{t.description}</p>
      <div className="flex justify-between text-xs border-t border-cream-deep pt-2">
        <span className="text-ink-muted">mean</span><span className="font-mono">{mean.toFixed(1)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-ink-muted">n</span><span className="font-mono">{scores.length}</span>
      </div>
    </div>
  );
}

function SessionDetail({ sessionId, summaries }: { sessionId: string; summaries: Summary[] }) {
  const row = summaries.find((s) => s.session._id === sessionId);
  if (!row) return <p className="text-sm text-ink-muted">missing</p>;
  const { session, choices, voice, artifact } = row;
  return (
    <div className="space-y-2 text-sm">
      <p><span className="text-ink-muted">guest</span> {session.guestName}</p>
      <p><span className="text-ink-muted">voice</span> <VoiceBadge status={voice?.status ?? "not_started"} /></p>
      <p><span className="text-ink-muted">choices</span> {choices.length}</p>
      {artifact && (
        <>
          <p><span className="text-ink-muted">headline</span> <span className="italic">{artifact.headline}</span></p>
          <p><span className="text-ink-muted">confidence</span> <span className="font-mono">{Math.round(artifact.confidence * 100)}%</span></p>
          <Link to={`/results/${session._id}`} className="inline-block mt-2 text-xs underline">open artifact</Link>
        </>
      )}
    </div>
  );
}

function ScenarioNodeDetail({ nodeId, summaries }: { nodeId: string; summaries: Summary[] }) {
  const picks: Record<string, number> = {};
  for (const s of summaries) {
    for (const c of s.choices) {
      if (c.nodeId === nodeId) picks[c.label] = (picks[c.label] ?? 0) + 1;
    }
  }
  const entries = Object.entries(picks).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <p className="text-sm text-ink-muted">no picks yet</p>;
  return (
    <div className="space-y-1.5 text-sm">
      {entries.map(([label, count]) => (
        <div key={label} className="flex items-start justify-between gap-2">
          <span className="flex-1 leading-snug">{label}</span>
          <span className="font-mono text-ink-muted">{count}</span>
        </div>
      ))}
    </div>
  );
}

function VoiceOutcomeDetail({ outcome, summaries }: { outcome: string; summaries: Summary[] }) {
  const matching = summaries.filter((s) => s.voice?.status === outcome);
  const hedging = matching.map((s) => (s.voice?.derivedSignals?.hedging ?? 0)).filter((n) => n > 0);
  const avgHedge = hedging.length === 0 ? 0 : hedging.reduce((a, b) => a + b, 0) / hedging.length;
  return (
    <div className="space-y-2 text-sm">
      <p className="text-ink-muted">n = {matching.length}</p>
      {avgHedge > 0 && (
        <p><span className="text-ink-muted">avg hedging</span> <span className="font-mono">{avgHedge.toFixed(1)}</span></p>
      )}
    </div>
  );
}

function buildGraph(summaries: Summary[]) {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seen = new Set<string>();
  const push = (n: GraphNode) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };

  for (const k of TRAIT_ORDER) push({ id: `trait:${k}`, label: TRAITS[k].label, group: "trait" });

  for (const sn of launchDayTangle.nodes) {
    if (sn.kind === "results") continue;
    push({ id: `node:${sn.id}`, label: sn.title, group: "scenarioNode" });
  }

  for (const outcome of ["answered", "fallback_typed", "declined", "failed"]) {
    push({ id: `voice:${outcome}`, label: outcome.replace("_", " "), group: "voiceOutcome" });
  }

  for (const { session, choices, voice, artifact } of summaries) {
    push({ id: `session:${session._id}`, label: session.guestName || session._id.slice(-5), group: "session" });

    if (artifact) {
      const topTraits = Object.entries(artifact.traitScores as Record<string, number>)
        .sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))
        .slice(0, 3);
      for (const [k, score] of topTraits) {
        links.push({ source: `session:${session._id}`, target: `trait:${k}`, weight: Math.max(1, (score - 50) / 25) });
      }
    }

    for (const c of choices) {
      // Only link to nodes that actually exist in the current scenario.
      // Old sessions may reference removed nodes (e.g. "final-call") which
      // would cause D3 to throw "node not found".
      if (seen.has(`node:${c.nodeId}`)) {
        links.push({ source: `session:${session._id}`, target: `node:${c.nodeId}`, weight: 1, kind: "choice" });
      }
    }

    const vStatus = voice?.status;
    if (vStatus && vStatus !== "not_started") {
      links.push({ source: `session:${session._id}`, target: `voice:${vStatus}`, weight: 1.5 });
    }
  }

  return { nodes, links };
}

function computeSeparation(summaries: Summary[]) {
  return launchDayTangle.nodes
    .filter((n) => n.kind === "choice" || n.kind === "chat" || n.kind === "freeText")
    .map((n) => {
      const picks = summaries.flatMap((s) => s.choices.filter((c) => c.nodeId === n.id));
      const count = picks.length;
      const hesitations = picks.map((p) => p.hesitationMs).sort((a, b) => a - b);
      const median = hesitations.length === 0 ? 0 : hesitations[Math.floor(hesitations.length / 2)];

      let spread = 0;
      if (n.kind === "choice" || n.kind === "chat") {
        const dist = new Map<string, number>();
        for (const p of picks) dist.set(p.choiceId, (dist.get(p.choiceId) ?? 0) + 1);
        const total = picks.length || 1;
        let entropy = 0;
        for (const [, c] of dist) { const p = c / total; entropy -= p * Math.log2(p); }
        spread = entropy;
      } else {
        const texts = summaries.flatMap((s) => s.freeTexts.filter((f) => f.nodeId === n.id).map((f) => f.text?.length ?? 0));
        if (texts.length >= 2) {
          const avg = texts.reduce((a, b) => a + b, 0) / texts.length;
          const variance = texts.reduce((a, b) => a + (b - avg) ** 2, 0) / texts.length;
          spread = Math.min(3, Math.sqrt(variance) / 40);
        }
      }
      return { nodeId: n.id, title: n.title, kind: n.kind, count, spread, medianHesitation: median };
    })
    .sort((a, b) => b.spread - a.spread);
}
