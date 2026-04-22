import { Topbar } from "@/components/layout/Topbar";
import { AnalyticsClient } from "./AnalyticsClient";

export default function AnalyticsPage() {
  return (
    <>
      <Topbar title="Analytics" />
      <main className="flex-1 p-6">
        <AnalyticsClient />
      </main>
    </>
  );
}

