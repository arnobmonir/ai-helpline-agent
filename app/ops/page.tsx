import { OpsDashboard } from "@/components/ops/OpsDashboard";
import { AppHeader } from "@/components/layout/AppHeader";

export default function OpsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <AppHeader
        active="ops"
        right={
          <p className="hidden text-right text-xs text-amber-muted sm:block">
            Live call · tools · tickets · scene
          </p>
        }
      />
      <OpsDashboard />
    </main>
  );
}
