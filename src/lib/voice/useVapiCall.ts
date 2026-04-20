import { useCallback, useEffect, useRef, useState } from "react";
import { getVapi, getVapiConfig, isVapiConfigured } from "./vapi";
import { events } from "../events";

export type CallPhase =
  | "idle"
  | "ringing"
  | "connecting"
  | "active_listening"
  | "active_speaking"
  | "ended"
  | "failed";

export type TranscriptLine = {
  role: "assistant" | "user";
  text: string;
  at: number;
};

/**
 * Structured output from the Vapi end-of-call-report.
 * Your assistant must be configured with a structuredData schema that includes
 * a `shipOrDelay` boolean (true = ship, false = delay).
 */
export type VapiStructuredOutput = {
  shipOrDelay?: boolean;
  [key: string]: unknown;
};

type Options = {
  onTranscriptUpdate?: (lines: TranscriptLine[]) => void;
  onPhaseChange?: (phase: CallPhase) => void;
  onError?: (err: string) => void;
};

export function useVapiCall(opts: Options = {}) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [structuredData, setStructuredData] = useState<VapiStructuredOutput | null>(null);
  const [callSummary, setCallSummary] = useState<string | null>(null);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const endedAtRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const setPhaseSafe = useCallback(
    (p: CallPhase) => {
      setPhase(p);
      opts.onPhaseChange?.(p);
    },
    [opts]
  );

  const pushTranscript = useCallback(
    (line: TranscriptLine) => {
      transcriptRef.current = [...transcriptRef.current, line];
      setTranscript(transcriptRef.current);
      opts.onTranscriptUpdate?.(transcriptRef.current);
    },
    [opts]
  );

  const start = useCallback(async () => {
    if (!isVapiConfigured()) {
      setError("voice_disabled");
      setPhaseSafe("failed");
      opts.onError?.("voice_disabled");
      return;
    }
    try {
      setError(null);
      setPhaseSafe("connecting");
      events.capture("voice_call_start_attempt");

      const vapi = getVapi();
      const { assistantId } = getVapiConfig();

      const onCallStart = () => {
        startedAtRef.current = Date.now();
        setPhaseSafe("active_listening");
        events.capture("voice_call_started");
      };
      const onCallEnd = () => {
        endedAtRef.current = Date.now();
        setPhaseSafe("ended");
        events.capture("voice_call_ended");
      };
      const onSpeechStart = () => setPhaseSafe("active_speaking");
      const onSpeechEnd = () => setPhaseSafe("active_listening");
      const onMessage = (msg: unknown) => {
        const m = msg as {
          type?: string;
          role?: "assistant" | "user";
          transcript?: string;
          transcriptType?: string;
          // end-of-call-report fields
          analysis?: {
            summary?: string;
            structuredData?: VapiStructuredOutput;
          };
        };

        if (m?.type === "transcript" && m.transcript && m.role) {
          if (m.transcriptType === "final" || !m.transcriptType) {
            pushTranscript({ role: m.role, text: m.transcript, at: Date.now() });
          }
        }

        if (m?.type === "end-of-call-report") {
          const summary = m.analysis?.summary ?? null;
          const structured = m.analysis?.structuredData ?? null;
          console.info("[vapi] end-of-call-report received", { summary, structured });
          if (summary) setCallSummary(summary);
          if (structured) setStructuredData(structured);
          events.capture("voice_structured_output_received", {
            hasShipOrDelay: structured?.shipOrDelay !== undefined,
            shipOrDelay: structured?.shipOrDelay,
          });
        }
      };
      const onError = (err: unknown) => {
        const msg =
          (err as { error?: { message?: string } })?.error?.message ??
          (err as { message?: string })?.message ??
          "unknown_error";
        setError(String(msg));
        setPhaseSafe("failed");
        opts.onError?.(String(msg));
        events.capture("voice_call_error", { message: String(msg) });
      };

      vapi.on("call-start", onCallStart);
      vapi.on("call-end", onCallEnd);
      vapi.on("speech-start", onSpeechStart);
      vapi.on("speech-end", onSpeechEnd);
      vapi.on("message", onMessage);
      vapi.on("error", onError);

      cleanupRef.current = () => {
        try {
          vapi.removeListener("call-start", onCallStart);
          vapi.removeListener("call-end", onCallEnd);
          vapi.removeListener("speech-start", onSpeechStart);
          vapi.removeListener("speech-end", onSpeechEnd);
          vapi.removeListener("message", onMessage);
          vapi.removeListener("error", onError);
        } catch {
          /* ignore */
        }
      };

      setPhaseSafe("ringing");
      await vapi.start(assistantId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "start_failed";
      setError(msg);
      setPhaseSafe("failed");
      opts.onError?.(msg);
    }
  }, [opts, pushTranscript, setPhaseSafe]);

  const stop = useCallback(() => {
    try {
      const vapi = getVapi();
      vapi.stop();
    } catch {
      /* ignore */
    }
    if (phase === "ringing" || phase === "connecting" || phase.startsWith("active")) {
      setPhaseSafe("ended");
      endedAtRef.current = Date.now();
    }
  }, [phase, setPhaseSafe]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return {
    phase,
    transcript,
    error,
    structuredData,
    callSummary,
    startedAt: startedAtRef.current,
    endedAt: endedAtRef.current,
    start,
    stop,
  };
}
