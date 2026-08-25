import { Softphone } from "@/components/softphone/Softphone";
import { DemoCustomersButton } from "@/components/demo/DemoCustomersButton";
import { AppHeader } from "@/components/layout/AppHeader";

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col">
      <AppHeader active="call" right={<DemoCustomersButton />} />

      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 py-12">
        <Softphone />
      </div>
    </main>
  );
}
