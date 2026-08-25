import Link from "next/link";
import { Softphone } from "@/components/softphone/Softphone";

export default function CallPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-amber-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold text-amber-red">
            ← Amber IT
          </Link>
          <p className="text-sm text-amber-muted">Caller softphone</p>
          <Link href="/ops" className="text-sm font-medium text-amber-ink hover:text-amber-red">
            Ops →
          </Link>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 py-12">
        <Softphone />
      </div>
    </main>
  );
}
