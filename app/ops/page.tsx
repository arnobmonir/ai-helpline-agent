import Link from "next/link";
import { OpsDashboard } from "@/components/ops/OpsDashboard";

export default function OpsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-amber-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold text-amber-red">
            ← Amber IT
          </Link>
          <div className="text-center">
            <p className="text-sm font-semibold text-amber-ink">
              Supervisor · Ops
            </p>
            <p className="text-xs text-amber-muted">
              Live call · tools · tickets · scene controls
            </p>
          </div>
          <Link
            href="/call"
            className="text-sm font-medium text-amber-ink hover:text-amber-red"
          >
            Softphone →
          </Link>
        </div>
      </header>
      <OpsDashboard />
    </main>
  );
}
