import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

type Props = {
  title: string;
  body: string;
  ctaLabel: string;
  onDismiss: () => void;
};

/**
 * A push-notification-style interruption banner that briefly takes over
 * the screen, then lets the user tap through to the next beat.
 */
export default function InterruptionBanner({ title, body, ctaLabel, onDismiss }: Props) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-10 px-4 bg-black/30 backdrop-blur-sm">
      <div
        className={`w-full max-w-sm rounded-2xl bg-white card-shadow-lg overflow-hidden transition-all duration-300 ${
          entered ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-cream-deep bg-cream-soft">
          <Bell className="w-3.5 h-3.5 text-accent-ember" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
            now · slack
          </span>
        </div>
        <div className="p-4">
          <p className="font-medium text-ink text-sm">{title}</p>
          <p className="text-sm text-ink-muted mt-1.5 leading-snug">{body}</p>
          <button
            onClick={onDismiss}
            className="mt-4 w-full rounded-full bg-ink text-cream py-2.5 text-sm font-medium"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
