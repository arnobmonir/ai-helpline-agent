import { Softphone } from "@/components/softphone/Softphone";
import { DemoCustomersButton } from "@/components/demo/DemoCustomersButton";

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col">
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
          <DemoCustomersButton />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 py-12">
        <Softphone />
      </div>
    </main>
  );
}
