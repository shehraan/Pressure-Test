import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSessionWithRelated } from "../lib/convexClient";

import { TRAITS } from "../lib/traits/model";
import { cn } from "../lib/utils";
import { ArrowLeft, Share2 } from "lucide-react";

export default function Share() {
  const { id } = useParams<{ id: string }>();
  const result = useSessionWithRelated(id);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  const artifact = result?.artifact ?? null;
  const session = result?.session ?? null;

  useEffect(() => {
    if (result === undefined) {
      console.warn("[Share] session query loading — id:", id);
    } else {
      console.info("[Share] session loaded:", result ? "found" : "null", "id:", id);
    }
  }, [result, id]);

  useEffect(() => {
    if (!artifact) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    runConfetti(canvas);
  }, [artifact]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Pressure Test",
          text: artifact?.shareSummary ?? "I just took the Pressure Test.",
          url,
        });
        return;
      }
    } catch {
      /* fall through */
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (result === undefined) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ink/20 border-t-ink animate-spin" />
      </div>
    );
  }

  if (!session || !artifact) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-8 text-center">
        <p className="font-display text-2xl text-ink">no card found</p>
        <Link to="/play" className="mt-4 underline text-ink-muted">
          start a Tangle
        </Link>
      </div>
    );
  }

  const traitScores = artifact.traitScores as Record<string, number>;
  const coreTraits = Object.entries(traitScores)
    .map(([key, score]) => ({
      key,
      label: TRAITS[key as keyof typeof TRAITS]?.label ?? key,
      short: TRAITS[key as keyof typeof TRAITS]?.short ?? "",
      score: score as number,
    }))
    .sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))
    .slice(0, 3);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-cream via-cream-soft to-cream-deep text-ink relative overflow-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
      <div className="relative z-10 max-w-md mx-auto px-5 pt-8 pb-10 flex flex-col">
        <Link
          to={`/results/${session._id}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="w-4 h-4" />
          back to results
        </Link>

        <div className="mt-8 aspect-[9/16] max-h-[640px] rounded-[28px] bg-gradient-to-br from-ink via-ink-soft to-accent-ink text-cream p-6 card-shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-accent-ember/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-accent-rose/20 blur-3xl" />

          <div className="relative h-full flex flex-col">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-cream/60">
              <span>pressure test</span>
              <span>№ {session._id.slice(-5)}</span>
            </div>

            <div className="mt-8">
              <p className="text-[11px] uppercase tracking-widest text-cream/50">read of</p>
              <p className="font-display text-3xl text-cream mt-1">
                {session.guestName || "a founder"}
              </p>
            </div>

            <p className="font-display text-[28px] leading-[1.1] mt-6 text-cream">
              {artifact.headline}
            </p>

            <div className="mt-auto space-y-2">
              {coreTraits.map((t, i) => (
                <div
                  key={t.key}
                  className={cn(
                    "flex items-baseline justify-between border-t border-cream/15 pt-2",
                    i === 0 && "border-t-0 pt-0"
                  )}
                >
                  <div>
                    <p className="font-display text-lg">{t.label}</p>
                    <p className="text-[10px] uppercase tracking-widest text-cream/50">{t.short}</p>
                  </div>
                  <p className="font-mono text-2xl">{t.score}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-cream/50">
              <span>launch day rollback</span>
              <span>v{artifact.artifactVersion}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={handleShare}
            className="rounded-full bg-ink text-cream py-3.5 font-medium text-sm active:scale-[0.99] transition-transform inline-flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            {copied ? "link copied" : "share"}
          </button>
          <Link
            to={`/results/${session._id}`}
            className="rounded-full border border-ink text-ink py-3.5 text-center font-medium text-sm active:scale-[0.99] transition-transform"
          >
            full artifact
          </Link>
        </div>
        <p className="text-center text-[11px] text-ink-muted mt-4">screenshot this. it's yours.</p>
      </div>
    </div>
  );
}

function runConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = (canvas.width = window.innerWidth * dpr);
  const h = (canvas.height = window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.scale(dpr, dpr);
  const colors = ["#d97757", "#c4605a", "#6b8e7f", "#1a1816", "#2b3441"];
  const pieces = Array.from({ length: 60 }, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * 200,
    vx: (Math.random() - 0.5) * 1.4,
    vy: 1.5 + Math.random() * 1.6,
    size: 4 + Math.random() * 5,
    rotation: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.15,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 0,
    max: 160 + Math.random() * 80,
  }));
  let frame = 0;
  const animate = () => {
    frame++;
    ctx.clearRect(0, 0, w, h);
    let alive = 0;
    for (const p of pieces) {
      p.life++;
      if (p.life > p.max) continue;
      alive++;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
      ctx.restore();
    }
    if (alive > 0 && frame < 400) requestAnimationFrame(animate);
  };
  animate();
}
