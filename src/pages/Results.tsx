import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSessionWithRelated } from "../lib/convexClient";
import TraitBar from "../components/results/TraitBar";
import EvidenceSnippetView from "../components/results/EvidenceSnippet";
import { TRAIT_ORDER, TRAITS } from "../lib/traits/model";
import type { ArtifactRecord, EvidenceSnippet } from "../lib/sessionStore";
import { Share2, Download, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

const LOAD_TIMEOUT_MS = 12_000;

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const result = useSessionWithRelated(id);
  const [showJson, setShowJson] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Surface a clear error instead of an infinite spinner if Convex never
  // returns data (e.g. the query threw server-side or the URL is wrong).
  useEffect(() => {
    if (result !== undefined) return;
    console.warn(`[Results] session query still loading after ${LOAD_TIMEOUT_MS / 1000}s — id:`, id);
    const t = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [result, id]);

  useEffect(() => {
    if (result === undefined) return;
    console.info("[Results] session loaded:", result);
  }, [result]);

  if (result === undefined) {
    if (timedOut) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink-muted mb-4">pressure test</p>
          <h1 className="font-display text-3xl text-ink mb-3">Couldn't load your results</h1>
          <p className="text-ink-muted text-sm mb-2 max-w-sm leading-relaxed">
            The Convex query for session{" "}
            <code className="font-mono text-xs bg-cream-deep px-1 rounded">{id}</code> never
            responded. Check the browser console for errors.
          </p>
          <p className="text-ink-muted text-xs mb-6 max-w-sm">
            Common causes: the session ID is wrong, the Convex deployment is offline,
            or <code className="font-mono">VITE_CONVEX_URL</code> doesn't match your project.
          </p>
          <Link to="/play" className="rounded-full bg-ink text-cream px-6 py-3 text-sm font-medium">
            start a new Tangle
          </Link>
        </div>
      );
    }
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-ink/20 border-t-ink animate-spin" />
        <p className="text-ink-muted text-xs">loading your artifact…</p>
      </div>
    );
  }

  if (result === null || !result.artifact) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-8 text-center">
        <p className="font-display text-2xl text-ink">no artifact for this session yet</p>
        <Link to="/play" className="mt-4 underline text-ink-muted">
          start a new Tangle
        </Link>
      </div>
    );
  }

  const { session, choices, freeTexts, voice, artifact } = result;

  // Map Convex artifact shape into ArtifactRecord shape for downstream components.
  // Evidence snippets are re-derived here from the stored artifact summary since
  // we keep evidence only in the local scorer for the vertical slice.
  const coreTraits = artifact.traitScores
    ? Object.entries(artifact.traitScores)
        .map(([key, score]) => ({
          key: key as keyof typeof artifact.traitScores,
          label: TRAITS[key as keyof typeof TRAITS]?.label ?? key,
          score: score as number,
          blurb: "",
        }))
        .sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))
        .slice(0, 3)
    : [];

  const jsonExport = JSON.stringify(
    {
      session: {
        id: session._id,
        guestName: session.guestName,
        prelude: session.prelude,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        scoringModelVersion: session.scoringModelVersion,
        nodesVisited: session.nodesVisited,
        choiceCount: choices.length,
        freeTextCount: freeTexts.length,
        voiceStatus: voice?.status ?? "not_started",
      },
      artifact,
    },
    null,
    2
  );

  const downloadJson = () => {
    const blob = new Blob([jsonExport], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pressure-test-${session._id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const traitScores = artifact.traitScores as Record<string, number>;
  const coreKeys = new Set(coreTraits.map((t) => t.key));

  return (
    <div className="min-h-[100dvh] bg-cream text-ink">
      <div className="max-w-xl mx-auto px-5 pt-12 pb-24">
        <p className="text-[11px] uppercase tracking-[0.24em] text-ink-muted">
          pressure test · launch day rollback
        </p>
        <h1 className="font-display text-[44px] leading-[1.05] mt-3 text-ink">
          {artifact.headline}
        </h1>
        <p className="text-ink-muted text-sm mt-3 italic">
          read from {choices.length} choices
          {voice?.status === "answered" && ", the call"}
          {voice?.status === "fallback_typed" && ", your note to Sarah"}
          {freeTexts.length > 0 && ", your Slack message"}.
        </p>

        {artifact.lowConfidence && (
          <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-amber-900 leading-snug">
              Low signal read — your session was short. Try the Tangle again for a sharper artifact.
            </p>
          </div>
        )}

        <section className="mt-10 space-y-5">
          <h2 className="font-display text-[22px] text-ink">Three things you actually are</h2>
          {coreTraits.map((t) => (
            <div key={t.key} className="rounded-2xl bg-white border border-cream-deep p-5 card-shadow">
              <p className="text-[11px] uppercase tracking-widest text-ink-muted">
                {TRAITS[t.key as keyof typeof TRAITS]?.short ?? ""}
              </p>
              <p className="font-display text-[26px] mt-1 mb-2 leading-tight">
                {t.label}
                <span className="font-mono text-base text-ink-muted ml-2">{t.score}</span>
              </p>
            </div>
          ))}
        </section>

        {artifact.mixedProfile && (
          <section className="mt-5 rounded-xl bg-cream-soft border border-cream-deep px-4 py-3">
            <p className="text-[11px] uppercase tracking-widest text-ink-muted mb-1">mixed profile</p>
            <p className="text-[14px] text-ink leading-snug">{artifact.mixedProfile}</p>
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-[22px] text-ink mb-3">The full read</h2>
          <div className="rounded-2xl bg-white border border-cream-deep p-5 card-shadow space-y-4">
            {TRAIT_ORDER.map((k) => (
              <TraitBar
                key={k}
                traitKey={k}
                score={traitScores[k] ?? 50}
                highlighted={coreKeys.has(k)}
              />
            ))}
            <div className="pt-4 border-t border-cream-deep flex items-center justify-between text-[11px] font-mono text-ink-muted">
              <span>scoring {artifact.scoringModelVersion}</span>
              <span>confidence {Math.round(artifact.confidence * 100)}%</span>
            </div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-3">
          <Link
            to={`/share/${session._id}`}
            className="rounded-full bg-ink text-cream py-3.5 text-center font-medium text-sm active:scale-[0.99] transition-transform inline-flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            share card
          </Link>
          <button
            onClick={downloadJson}
            className="rounded-full border border-ink text-ink py-3.5 text-center font-medium text-sm active:scale-[0.99] transition-transform inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            json export
          </button>
        </section>

        <section className="mt-6">
          <button onClick={() => setShowJson((s) => !s)} className="text-[12px] text-ink-muted underline">
            {showJson ? "hide raw data" : "peek at the raw artifact"}
          </button>
          {showJson && (
            <pre className="mt-3 rounded-xl bg-ink text-cream p-4 text-[11px] leading-snug font-mono overflow-x-auto max-h-96 overflow-y-auto no-scrollbar">
              {jsonExport}
            </pre>
          )}
        </section>

        <section className="mt-10 flex flex-col items-center gap-3 text-center">
          <Link
            to="/play"
            className={cn("inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink")}
          >
            run another Tangle
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/admin/trait-lab" className="text-[11px] text-ink-muted underline">
            open trait lab
          </Link>
        </section>
      </div>
    </div>
  );
}
