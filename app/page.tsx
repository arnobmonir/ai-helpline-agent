import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-amber-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-red text-sm font-bold text-white">
              AIT
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-amber-red">
                Amber IT
              </p>
              <p className="text-xs text-amber-muted">AI Helpline Demo</p>
            </div>
          </div>
          <p className="hidden text-xs text-amber-muted sm:block">
            Sales demo · not a live BTRC number
          </p>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 py-16">
        <div className="max-w-2xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-red">
            24/7 support pitch
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-amber-ink sm:text-5xl">
            Nusrat answers like Amber IT helpline — Bangla, English, or Banglish.
          </h1>
          <p className="text-lg text-amber-muted">
            Open the caller softphone and supervisor screen side by side. Dial{" "}
            <span className="font-semibold text-amber-ink">09611-123123</span>,
            hear the greeting, and watch tools, tickets, and handoff live on
            Ops.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/call"
            className="group rounded-2xl border border-amber-border bg-white p-6 shadow-sm transition hover:border-amber-red hover:shadow-md"
          >
            <p className="text-sm font-medium text-amber-red">Caller</p>
            <h2 className="mt-2 text-2xl font-semibold">Softphone</h2>
            <p className="mt-2 text-sm text-amber-muted">
              Ring → connected. Mute / hang up. Captions off by default.
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-semibold text-amber-red group-hover:underline">
              Open /call →
            </span>
          </Link>

          <Link
            href="/ops"
            className="group rounded-2xl border border-amber-border bg-white p-6 shadow-sm transition hover:border-amber-red hover:shadow-md"
          >
            <p className="text-sm font-medium text-amber-red">Supervisor</p>
            <h2 className="mt-2 text-2xl font-semibold">Ops dashboard</h2>
            <p className="mt-2 text-sm text-amber-muted">
              Live transcript, tool calls, customer card, tickets, scene
              toggles.
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-semibold text-amber-red group-hover:underline">
              Open /ops →
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-dashed border-amber-border bg-white/60 p-5 text-sm text-amber-muted">
          <p className="font-medium text-amber-ink">Pitch checklist</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Bangla: internet nai / ONU red light → outage + ticket</li>
            <li>English: what&apos;s my bill? → amount + bKash path</li>
            <li>Upgrade to 200 Mbps → ৳2000 + 5% VAT (৳2100)</li>
            <li>Barge-in while she is talking</li>
            <li>“I want a human” → handoff on /ops</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
