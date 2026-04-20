import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { cn } from "../../lib/utils";

type Props = {
  callerName: string;
  callerRole: string;
  callerInitials: string;
  colorClass: string;
  onAnswer: () => void;
  onDecline: () => void;
};

/**
 * Full-screen iOS-style incoming call overlay. Kicks off as soon as the
 * story hits the voice node. Ringing animation, pulsing avatar, accept/decline.
 */
export default function IncomingCallModal({
  callerName,
  callerRole,
  callerInitials,
  colorClass,
  onAnswer,
  onDecline,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);

    // Start ringtone
    const audio = new Audio("/IPhone ringtone.mp3");
    audio.loop = true;
    audio.volume = 0.7;
    audioRef.current = audio;
    audio.play().catch(() => {
      // Autoplay blocked — browser requires a user gesture first.
      // The modal is still visually fine without sound.
    });

    // Vibrate pattern
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate?.([400, 200, 400, 200, 400]);
      } catch {
        /* ignore */
      }
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const handleAnswer = () => {
    audioRef.current?.pause();
    onAnswer();
  };

  const handleDecline = () => {
    audioRef.current?.pause();
    onDecline();
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-between py-14 px-6",
        "bg-gradient-to-b from-ink via-ink-soft to-black text-cream",
        "transition-opacity duration-300",
        mounted ? "opacity-100" : "opacity-0"
      )}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 pointer-events-none grain opacity-30" />

      <div className="flex flex-col items-center gap-4 mt-6 z-10">
        <p className="text-sm uppercase tracking-[0.3em] text-cream/60 animate-pulse">
          incoming call
        </p>
        <p className="text-xs text-cream/40 font-mono">mobile · now</p>
      </div>

      <div className="relative flex flex-col items-center gap-6 z-10">
        <div className="relative">
          <span
            className={cn(
              "absolute inset-0 rounded-full bg-gradient-to-br opacity-60 animate-pulse-ring",
              colorClass
            )}
          />
          <span
            className={cn(
              "absolute inset-0 rounded-full bg-gradient-to-br opacity-40 animate-pulse-ring",
              colorClass
            )}
            style={{ animationDelay: "0.7s" }}
          />
          <div
            className={cn(
              "relative w-36 h-36 rounded-full bg-gradient-to-br flex items-center justify-center",
              "text-5xl font-display text-cream shadow-2xl",
              colorClass
            )}
          >
            {callerInitials}
          </div>
        </div>
        <div className="text-center mt-2">
          <p className="font-display text-4xl">{callerName}</p>
          <p className="text-cream/60 text-sm mt-1">{callerRole}</p>
        </div>
      </div>

      <div className="flex items-center justify-between w-full max-w-xs z-10 mb-4">
        <button
          onClick={handleDecline}
          className="flex flex-col items-center gap-2 group"
          aria-label="Decline call"
        >
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
            <PhoneOff className="w-7 h-7 text-white" />
          </div>
          <span className="text-xs text-cream/70">decline</span>
        </button>
        <button
          onClick={handleAnswer}
          className="flex flex-col items-center gap-2 group"
          aria-label="Answer call"
        >
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-green-500 opacity-60 animate-pulse-ring" />
            <div className="relative w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
              <Phone className="w-7 h-7 text-white animate-ring-shake" />
            </div>
          </div>
          <span className="text-xs text-cream/70">answer</span>
        </button>
      </div>
    </div>
  );
}
