import { Link } from "react-router-dom";
import { ArrowUpRight, Phone, MessageSquare, PenLine } from "lucide-react";
import { launchDayTangle } from "../data/tangles/launchDay";
import { isVapiConfigured } from "../lib/voice/vapi";

export default function Landing() {
  const voiceReady = isVapiConfigured();

  return (
    <div className="min-h-[100dvh] bg-cream text-ink relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-cream-deep to-cream pointer-events-none" />
      <div className="absolute top-20 -right-32 w-80 h-80 rounded-full bg-accent-ember/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -left-32 w-80 h-80 rounded-full bg-accent-rose/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-12 pb-10">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink-muted">
            pressure test
          </p>
          <Link
            to="/admin/trait-lab"
            className="text-[11px] uppercase tracking-widest text-ink-muted underline-offset-2 hover:underline"
          >
            trait lab
          </Link>
        </div>

        <h1 className="font-display text-[56px] leading-[0.95] mt-10 text-ink">
          A 7-minute
          <br />
          scenario that
          <br />
          <em className="italic">reads you.</em>
        </h1>

        <p className="font-serif text-[18px] text-ink-muted mt-6 leading-relaxed">
          Pressure Test is a behavioral scenario game for people who build things
          under real constraints. Your choices, your messages, and one
          unexpected phone call become the evidence behind a short, specific
          artifact about how you actually move under pressure.
        </p>

        <Link
          to="/play"
          className="mt-8 inline-flex items-center justify-center gap-2 w-full rounded-full bg-ink text-cream py-4 font-medium tracking-wide active:scale-[0.99] transition-transform"
        >
          start the Tangle
          <ArrowUpRight className="w-4 h-4" />
        </Link>
        <p className="text-[12px] text-ink-muted text-center mt-3">
          ~7 minutes · mobile-first · works on anything
        </p>

        <div className="mt-14">
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-5">
            today's tangle
          </p>
          <div className="rounded-2xl bg-white border border-cream-deep p-5 card-shadow">
            <p className="font-display text-2xl">{launchDayTangle.title}</p>
            <p className="text-sm text-ink-muted mt-1.5 italic">
              {launchDayTangle.tagline}
            </p>
            <p className="text-[14.5px] text-ink mt-3 leading-relaxed">
              {launchDayTangle.description}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-[11px] text-ink-muted">
              <Feature Icon={MessageSquare} label="forced choices" />
              <Feature Icon={PenLine} label="free-text moments" />
              <Feature
                Icon={Phone}
                label={voiceReady ? "voice interrupt" : "voice (fallback)"}
              />
            </div>
          </div>
        </div>

        <div className="mt-14 space-y-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
            what you'll get
          </p>
          <Bullet n="01" title="Three core traits read from your actions">
            Not a personality label. A short, specific behavioral read with
            evidence from what you actually did.
          </Bullet>
          <Bullet n="02" title="One tension and one growth edge">
            Where you look split. Where you're one beat late.
          </Bullet>
          <Bullet n="03" title="A collectible share card">
            Portrait, screenshot-ready, actually worth posting.
          </Bullet>
          <Bullet n="04" title="Full JSON export of your signal">
            Every choice, timing, transcript, and score.
          </Bullet>
        </div>

        {/* <div className="mt-14 rounded-2xl bg-ink text-cream p-6 card-shadow-lg">
          <p className="text-[11px] uppercase tracking-widest text-cream/60">
            about the voice moment
          </p>
          <p className="font-display text-[26px] leading-tight mt-2">
            Somewhere in the middle, your phone rings.
          </p>
          <p className="text-[14.5px] text-cream/80 mt-3 leading-relaxed">
            It's the founder. She's asking you a hard question with under a
            minute to answer. The way you respond becomes part of the read.
            If voice fails, we fall back to a typed urgent-note mode so the
            moment still lands.
          </p>
        </div> */}

        <Link
          to="/play"
          className="mt-10 inline-flex items-center justify-center gap-2 w-full rounded-full bg-ink text-cream py-4 font-medium tracking-wide active:scale-[0.99] transition-transform"
        >
          start the Tangle
          <ArrowUpRight className="w-4 h-4" />
        </Link>

        <p className="text-center text-[11px] text-ink-muted mt-10">
          Pressure Test · vertical slice demo
        </p>
      </div>
    </div>
  );
}

function Feature({
  Icon,
  label,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <Icon className="w-4 h-4 text-ink" />
      <span>{label}</span>
    </div>
  );
}

function Bullet({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-cream-deep pt-4 flex gap-4">
      <span className="font-mono text-[11px] text-ink-muted pt-1">{n}</span>
      <div className="flex-1">
        <p className="font-display text-lg leading-snug">{title}</p>
        <p className="text-[14px] text-ink-muted mt-1 leading-snug">{children}</p>
      </div>
    </div>
  );
}
