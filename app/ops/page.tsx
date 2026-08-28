import { OpsDashboard } from "@/components/ops/OpsDashboard";
import { AppHeader } from "@/components/layout/AppHeader";
import { VoiceSettingsButton } from "@/components/softphone/VoiceSettingsButton";

export default function OpsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <AppHeader
        active="ops"
        right={
          <div className="flex items-center gap-2">
            <VoiceSettingsButton />
            <p className="hidden text-right text-xs text-amber-muted sm:block">
              Live call · tools · tickets · scene
            </p>
          </div>
        }
      />
      <OpsDashboard />
    </main>
  );
}
