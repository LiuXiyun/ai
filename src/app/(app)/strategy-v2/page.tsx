import { Topbar } from "@/components/layout/Topbar";
import { StrategyV2Client } from "./StrategyV2Client";

export default function StrategyV2Page() {
  return (
    <>
      <Topbar title="分层策略分析" />
      <StrategyV2Client />
    </>
  );
}
