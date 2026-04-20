import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PreludeForm from "../components/tangle/PreludeForm";
import ProgressBar from "../components/tangle/ProgressBar";
import TimelineNode from "../components/tangle/TimelineNode";
import ChoiceCard from "../components/tangle/ChoiceCard";
import ChatInterlude from "../components/tangle/ChatInterlude";
import FreeTextNodeView from "../components/tangle/FreeTextNode";
import InterruptionBanner from "../components/tangle/InterruptionBanner";
import IncomingCallModal from "../components/voice/IncomingCallModal";
import LiveCallScreen from "../components/voice/LiveCallScreen";
import CallSummary from "../components/voice/CallSummary";
import TypedFallback from "../components/voice/TypedFallback";
import { launchDayTangle } from "../data/tangles/launchDay";
import { ScenarioEngine } from "../lib/scenario/engine";
import type {
  ChoiceNode,
  ChatInterludeNode,
  FreeTextNode,
  InterruptionNode,
  NarrativeNode,
  PreludeAnswers,
  ScenarioNode,
  VoiceNode,
} from "../lib/scenario/types";
import {
  useCreateSession,
  useRecordChoice,
  useRecordFreeText,
  useCompleteSession,
  useUpsertVoiceCall,
  useSaveArtifact,
} from "../lib/convexClient";
import type { Id } from "../../convex/_generated/dataModel";
import { useVapiCall } from "../lib/voice/useVapiCall";
import type { CallPhase, TranscriptLine } from "../lib/voice/useVapiCall";
import { isVapiConfigured } from "../lib/voice/vapi";
import { deriveSignals, transcriptToText } from "../lib/voice/signals";
import { generateArtifact } from "../lib/scoring/scorer";
import { SCORING_MODEL_VERSION } from "../lib/traits/model";
import type { ChoiceLog, FreeTextLog, VoiceCallLog } from "../lib/sessionStore";
import { events } from "../lib/events";

type VoicePhaseLocal = "incoming" | "typed_fallback" | "live" | "summary" | "done";

export default function Play() {
  const navigate = useNavigate();

  // Convex mutations
  const createSession = useCreateSession();
  const recordChoice = useRecordChoice();
  const recordFreeText = useRecordFreeText();
  const completeSession = useCompleteSession();
  const upsertVoiceCall = useUpsertVoiceCall();
  const saveArtifact = useSaveArtifact();

  // Local game state
  const [prelude, setPrelude] = useState<PreludeAnswers | null>(null);
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [startedAt] = useState(() => Date.now());

  // Accumulate gameplay data locally for artifact generation
  const localChoicesRef = useRef<ChoiceLog[]>([]);
  const localFreeTextRef = useRef<FreeTextLog[]>([]);
  const localVoiceRef = useRef<VoiceCallLog>({
    status: "not_started",
    transcript: [],
    usedVoice: false,
  });

  const engineRef = useRef<ScenarioEngine>(new ScenarioEngine(launchDayTangle));
  const [, forceRender] = useState(0);
  const rerender = () => forceRender((x) => x + 1);

  const [voicePhase, setVoicePhase] = useState<VoicePhaseLocal | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<TranscriptLine[]>([]);
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [voiceFallbackText, setVoiceFallbackText] = useState("");
  const [voiceStatus, setVoiceStatus] = useState<VoiceCallLog["status"]>("answered");
  const [interruptionOpen, setInterruptionOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const voiceCall = useVapiCall({
    onTranscriptUpdate: setVoiceTranscript,
    onError: () => setVoicePhase("typed_fallback"),
  });

  // Trigger voice/interruption UI when a new node renders
  useEffect(() => {
    if (!sessionId || !prelude) return;
    const node = engineRef.current.current;
    if (node.kind === "interruption") setInterruptionOpen(true);
    else if (node.kind === "voice") {
      setVoicePhase("incoming");
      events.capture("voice_moment_triggered", { nodeId: node.id });
    }
  }, [sessionId, prelude]);

  const startSession = useCallback(
    async (answers: PreludeAnswers) => {
      const id = await createSession({
        guestName: answers.name || "Guest",
        prelude: answers,
        scenarioId: launchDayTangle.id,
        scoringModelVersion: SCORING_MODEL_VERSION,
      });
      setPrelude(answers);
      setSessionId(id);
      events.capture("session_started", { surface: answers.surface });
    },
    [createSession]
  );

  // Ref mirror of finishSession so `advance` (which needs stable identity) can
  // always call the LATEST version. Without this we hit a stale-closure bug:
  // `advance` captured a finishSession from the first render when sessionId/
  // prelude were still null, and it silently early-returned forever.
  const finishSessionRef = useRef<() => Promise<void>>(async () => {});

  const advance = useCallback(() => {
    const next = engineRef.current.next();
    if (!next) {
      console.warn("[Play] advance() called but engine has no next node");
      return;
    }
    console.info("[Play] advance →", next.kind, next.id);
    rerender();
    if (next.kind === "interruption") {
      setInterruptionOpen(true);
    } else if (next.kind === "voice") {
      setVoicePhase("incoming");
      events.capture("voice_moment_triggered", { nodeId: next.id });
    } else if (next.kind === "results") {
      console.info("[Play] reached results node → calling finishSession()");
      void finishSessionRef.current();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finishSession = useCallback(async () => {
    console.info("[Play] finishSession() entered", {
      sessionId,
      hasPrelude: !!prelude,
      completing,
    });
    if (!sessionId || !prelude || completing) {
      console.warn("[Play] finishSession() early-returned", {
        sessionId,
        hasPrelude: !!prelude,
        completing,
      });
      return;
    }
    setCompleting(true);

    const voiceLog = localVoiceRef.current;

    const localSession = {
      id: sessionId as string,
      guestName: prelude.name || "Guest",
      prelude,
      startedAt,
      completedAt: Date.now(),
      scoringModelVersion: SCORING_MODEL_VERSION,
      nodesVisited: engineRef.current.scenario.nodes.map((n) => n.id),
      choices: localChoicesRef.current,
      freeText: localFreeTextRef.current,
      voice: voiceLog,
      scenarioId: launchDayTangle.id,
    };

    const artifact = generateArtifact(localSession);

    try {
      await upsertVoiceCall({
        sessionId,
        status: voiceLog.status,
        transcript: voiceLog.transcript,
        fallbackTranscript: voiceLog.fallbackTranscript,
        usedVoice: voiceLog.usedVoice,
        startedAt: voiceLog.startedAt,
        endedAt: voiceLog.endedAt,
        derivedSignals: voiceLog.derivedSignals,
        shipOrDelay: voiceLog.shipOrDelay,
        callSummary: voiceLog.callSummary,
      });
      console.info("[Play] voiceCall saved");

      await completeSession({ sessionId });
      console.info("[Play] session marked complete");

      await saveArtifact({
        sessionId,
        artifactVersion: artifact.artifactVersion,
        scoringModelVersion: artifact.scoringModelVersion,
        traitScores: artifact.traitScores,
        confidence: artifact.confidence,
        headline: artifact.headline,
        summary: artifact.summary,
        shareSummary: artifact.shareSummary,
        lowConfidence: artifact.lowConfidence,
        mixedProfile: artifact.mixedProfile,
      });
      console.info("[Play] artifact saved, navigating to results");

      events.capture("artifact_generated", { confidence: artifact.confidence });
      setTimeout(() => navigate(`/results/${sessionId}`), 900);
    } catch (err) {
      console.error("[Play] finishSession failed — could not persist to Convex:", err);
      // Navigate anyway so the user isn't stuck on the "reading you back" screen.
      // The Results page will show a timeout error if the artifact wasn't saved.
      setTimeout(() => navigate(`/results/${sessionId}`), 900);
    }
  }, [sessionId, prelude, completing, startedAt, upsertVoiceCall, completeSession, saveArtifact, navigate]);

  // Keep the ref pointing at the latest finishSession so `advance` can call it
  // without needing to include it in its (empty) deps array.
  useEffect(() => {
    finishSessionRef.current = finishSession;
  }, [finishSession]);

  const handleChoice = useCallback(
    async (
      node: ChoiceNode | ChatInterludeNode,
      optionId: string,
      label: string,
      hesitationMs: number
    ) => {
      if (!sessionId) return;
      const log: ChoiceLog = {
        nodeId: node.id,
        choiceId: optionId,
        label,
        at: Date.now(),
        hesitationMs,
      };
      localChoicesRef.current = [...localChoicesRef.current, log];
      events.capture("choice_made", { nodeId: node.id, choiceId: optionId, hesitationMs });
      void recordChoice({ sessionId, nodeId: node.id, choiceId: optionId, label, hesitationMs });
      advance();
    },
    [sessionId, recordChoice, advance]
  );

  const handleFreeText = useCallback(
    async (
      node: FreeTextNode,
      text: string,
      meta: { editCount: number; backspaces: number; durationMs: number }
    ) => {
      if (!sessionId) return;
      const log: FreeTextLog = { nodeId: node.id, text, ...meta };
      localFreeTextRef.current = [...localFreeTextRef.current, log];
      events.capture("free_text_submitted", { nodeId: node.id, wordCount: text.split(/\s+/).length });
      void recordFreeText({ sessionId, nodeId: node.id, text, ...meta });
      advance();
    },
    [sessionId, recordFreeText, advance]
  );

  const handleAnswerCall = useCallback(() => {
    setVoiceUsed(true);
    setVoiceStatus("answered");
    if (isVapiConfigured()) {
      setVoicePhase("live");
      void voiceCall.start();
    } else {
      setVoicePhase("typed_fallback");
      setVoiceStatus("fallback_typed");
    }
  }, [voiceCall]);

  const handleDeclineCall = useCallback(() => {
    setVoiceUsed(false);
    setVoiceStatus("declined");
    const node = engineRef.current.current as VoiceNode;
    localVoiceRef.current = { status: "declined", transcript: [], usedVoice: false };
    events.capture("voice_call_declined", { nodeId: node.id });
    setVoicePhase("typed_fallback");
    setVoiceStatus("fallback_typed");
  }, []);

  const handleHangUp = useCallback(() => {
    voiceCall.stop();
    setVoicePhase("summary");
    setVoiceStatus("answered");
  }, [voiceCall]);

  useEffect(() => {
    if (voicePhase !== "live") return;
    if (voiceCall.phase === "ended" || voiceCall.phase === "failed") {
      if (voiceCall.phase === "failed" && voiceCall.transcript.length === 0) {
        setVoicePhase("typed_fallback");
        setVoiceStatus("failed");
        return;
      }
      setVoicePhase("summary");
      setVoiceStatus("answered");
    }
  }, [voiceCall.phase, voiceCall.transcript.length, voicePhase]);

  const finalizeVoice = useCallback(
    (opts: {
      transcript: TranscriptLine[];
      fallbackText?: string;
      usedVoice: boolean;
      status: VoiceCallLog["status"];
    }) => {
      const text = transcriptToText(opts.transcript, opts.fallbackText);
      const signals = text ? deriveSignals(text) : undefined;
      // Pull structured output from Vapi if it arrived (may be null for typed fallback paths)
      const shipOrDelay = voiceCall.structuredData?.shipOrDelay ?? null;
      const callSummary = voiceCall.callSummary ?? null;
      console.info("[Play] finalizeVoice", { shipOrDelay, callSummary });
      localVoiceRef.current = {
        status: opts.status,
        transcript: opts.transcript,
        fallbackTranscript: opts.fallbackText,
        derivedSignals: signals,
        usedVoice: opts.usedVoice,
        startedAt: voiceCall.startedAt ?? undefined,
        endedAt: Date.now(),
        shipOrDelay,
        callSummary,
      };
      events.capture("voice_finalized", {
        status: opts.status,
        usedVoice: opts.usedVoice,
        wordCount: signals?.wordCount ?? 0,
        shipOrDelay,
      });
    },
    [voiceCall.startedAt, voiceCall.structuredData, voiceCall.callSummary]
  );

  const handleFallbackSubmit = useCallback(
    (text: string) => {
      setVoiceFallbackText(text);
      finalizeVoice({
        transcript: [],
        fallbackText: text,
        usedVoice: false,
        status: voiceStatus === "declined" ? "declined" : "fallback_typed",
      });
      setVoicePhase("summary");
    },
    [finalizeVoice, voiceStatus]
  );

  const handleCallContinue = useCallback(() => {
    if (voiceUsed) {
      finalizeVoice({ transcript: voiceTranscript, usedVoice: true, status: "answered" });
    }
    setVoicePhase(null);
    advance();
  }, [advance, finalizeVoice, voiceTranscript, voiceUsed]);

  const handleDismissInterruption = useCallback(() => {
    setInterruptionOpen(false);
    advance();
  }, [advance]);

  const renderNode = (node: ScenarioNode) => {
    switch (node.kind) {
      case "narrative":
        return <NarrativeView key={node.id} node={node as NarrativeNode} onNext={advance} />;
      case "choice":
        return (
          <div key={node.id} className="space-y-6">
            <TimelineNode beats={node.beats} tag={node.tag} title={node.title} />
            <ChoiceCard
              prompt={node.prompt}
              options={node.options}
              onPick={(opt, hes) => void handleChoice(node, opt.id, opt.label, hes)}
            />
          </div>
        );
      case "chat":
        return (
          <ChatInterlude
            key={node.id}
            node={node}
            onPick={(opt, hes) => void handleChoice(node, opt.id, opt.label, hes)}
          />
        );
      case "freeText":
        return (
          <FreeTextNodeView
            key={node.id}
            node={node}
            onSubmit={(text, meta) => void handleFreeText(node, text, meta)}
          />
        );
      case "interruption":
      case "voice":
        return (
          <div key={node.id} className="min-h-[40vh] flex items-center justify-center">
            <p className="text-ink-muted italic">…</p>
          </div>
        );
      case "results":
        return (
          <div key={node.id} className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-ink/20 border-t-ink animate-spin mb-5" />
            <p className="font-display text-2xl text-ink">reading you back</p>
            <p className="text-ink-muted text-sm mt-2">building the artifact</p>
          </div>
        );
    }
  };

  if (!prelude || !sessionId) {
    return <PreludeForm onStart={(answers) => void startSession(answers)} />;
  }

  const current = engineRef.current.current;
  const progress = engineRef.current.progress;
  const voiceNode = current.kind === "voice" ? (current as VoiceNode) : null;
  const interruptionNode = current.kind === "interruption" ? (current as InterruptionNode) : null;

  return (
    <div className="min-h-[100dvh] bg-cream text-ink relative">
      <ProgressBar
        ratio={progress.ratio}
        tag={current.kind !== "results" ? current.tag : undefined}
        title={current.kind !== "results" && "title" in current ? current.title : undefined}
      />
      <main className="max-w-xl mx-auto px-5 pt-6 pb-24">{renderNode(current)}</main>

      {interruptionOpen && interruptionNode && (
        <InterruptionBanner
          title={interruptionNode.title}
          body={interruptionNode.body}
          ctaLabel={interruptionNode.ctaLabel}
          onDismiss={handleDismissInterruption}
        />
      )}

      {voicePhase === "incoming" && voiceNode && (
        <IncomingCallModal
          callerName={voiceNode.caller.name}
          callerRole={voiceNode.caller.role}
          callerInitials={voiceNode.caller.initials}
          colorClass={voiceNode.caller.colorClass}
          onAnswer={handleAnswerCall}
          onDecline={handleDeclineCall}
        />
      )}

      {voicePhase === "live" && voiceNode && (
        <LiveCallScreen
          callerName={voiceNode.caller.name}
          callerRole={voiceNode.caller.role}
          callerInitials={voiceNode.caller.initials}
          colorClass={voiceNode.caller.colorClass}
          phase={voiceCall.phase as CallPhase}
          transcript={voiceCall.transcript}
          onHangUp={handleHangUp}
        />
      )}

      {voicePhase === "typed_fallback" && voiceNode && (
        <TypedFallback
          callerName={voiceNode.caller.name}
          callerRole={voiceNode.caller.role}
          callerInitials={voiceNode.caller.initials}
          colorClass={voiceNode.caller.colorClass}
          assistantOpening={voiceNode.assistantOpening}
          prompt={voiceNode.fallbackPrompt}
          placeholder={voiceNode.fallbackPlaceholder}
          onDismiss={() => setVoicePhase("incoming")}
          onSubmit={handleFallbackSubmit}
        />
      )}

      {voicePhase === "summary" && voiceNode && (
        <div className="fixed inset-0 z-50 bg-cream flex items-center justify-center px-5 py-10 overflow-y-auto">
          <CallSummary
            callerName={voiceNode.caller.name}
            transcript={voiceCall.transcript}
            fallbackText={voiceFallbackText || undefined}
            vapiSummary={voiceCall.callSummary ?? undefined}
            shipOrDelay={voiceCall.structuredData?.shipOrDelay}
            signals={
              voiceFallbackText
                ? deriveSignals(voiceFallbackText)
                : voiceCall.transcript.length > 0
                ? deriveSignals(transcriptToText(voiceCall.transcript))
                : undefined
            }
            onContinue={handleCallContinue}
            status={voiceStatus === "not_started" ? "answered" : voiceStatus}
          />
        </div>
      )}
    </div>
  );
}

function NarrativeView({ node, onNext }: { node: NarrativeNode; onNext: () => void }) {
  return (
    <div className="space-y-8">
      <TimelineNode beats={node.beats} tag={node.tag} title={node.title} />
      <button
        onClick={onNext}
        className="w-full rounded-full bg-ink text-cream py-3.5 font-medium tracking-wide active:scale-[0.99] transition-transform animate-slide-up"
        style={{ animationDelay: "1.1s", animationFillMode: "backwards" }}
      >
        {node.nextLabel ?? "continue"}
      </button>
    </div>
  );
}
