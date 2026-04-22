import { Topbar } from "@/components/layout/Topbar";
import { StrategyClient } from "./StrategyClient";

export default function StrategyPage() {
  return (
    <>
      <Topbar title="竞争策略分析" />
      <StrategyClient />
    </>
  );
}
