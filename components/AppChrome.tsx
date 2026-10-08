import Link from "next/link";
import { BackIcon, GearIcon } from "./Icons";

export function Wordmark() {
  return (
    <div>
      <p className="text-[15px] font-black tracking-[0.22em]">
        RUN<span className="text-accent">KIT</span>
      </p>
      <p className="text-xs text-muted">Know what to wear.</p>
    </div>
  );
}

const iconButton =
  "grid size-11 place-items-center rounded-full text-foreground transition hover:bg-card focus-visible:outline-2 focus-visible:outline-accent";

export function HomeHeader() {
  return (
    <header className="flex items-center justify-between">
      <Wordmark />
      <Link href="/settings" aria-label="Settings" className={iconButton}>
        <GearIcon />
      </Link>
    </header>
  );
}

export function BackHeader({ title }: { title?: string }) {
  return (
    <header className="flex items-center gap-2">
      <Link
        href="/"
        className="-ml-3 inline-flex h-11 items-center gap-1 rounded-full pl-2 pr-4 text-sm font-semibold transition hover:bg-card focus-visible:outline-2 focus-visible:outline-accent"
      >
        <BackIcon /> Back
      </Link>
      {title && <h1 className="text-lg font-semibold">{title}</h1>}
    </header>
  );
}

/** Shown until client state has loaded — doubles as the splash screen. */
export function Splash() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24" role="status">
      <p className="text-xl font-black tracking-[0.22em]">
        RUN<span className="text-accent">KIT</span>
      </p>
      <p className="text-sm text-muted">Know what to wear.</p>
    </div>
  );
}

export const pageShell =
  "mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]";

export const primaryButton =
  "flex h-14 w-full items-center justify-center rounded-2xl bg-accent px-6 text-base font-bold tracking-wide text-accent-ink shadow-[0_8px_24px_-8px_var(--accent)] transition hover:brightness-105 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-40 disabled:shadow-none";
