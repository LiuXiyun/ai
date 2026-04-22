import { Topbar } from "@/components/layout/Topbar";
import { GeneratorClient } from "./GeneratorClient";

export default function GeneratorPage() {
  return (
    <>
      <Topbar title="Generator" />
      <main className="flex-1 p-6">
        <GeneratorClient />
      </main>
    </>
  );
}

