import Link from "next/link";
import type { ReactNode } from "react";

export function AppHeader({
  active,
  right,
}: {
  active: "call" | "ops";
  right?: ReactNode;
}) {
  return (
    <header className="border-b border-amber-border bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-red text-sm font-bold text-white">
            AIT
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-amber-red">
              Amber IT
            </p>
            <p className="text-xs text-amber-muted">AI Helpline Demo</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            href="/"
            className={`rounded-full px-3 py-1.5 ${
              active === "call"
                ? "bg-amber-cream text-amber-red"
                : "text-amber-ink hover:text-amber-red"
            }`}
          >
            Softphone
          </Link>
          <Link
            href="/ops"
            className={`rounded-full px-3 py-1.5 ${
              active === "ops"
                ? "bg-amber-cream text-amber-red"
                : "text-amber-ink hover:text-amber-red"
            }`}
          >
            Supervisor
          </Link>
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  );
}
