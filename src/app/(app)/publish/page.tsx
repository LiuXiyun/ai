import { Topbar } from "@/components/layout/Topbar";
import { PublishClient } from "./PublishClient";

export default function PublishPage() {
  return (
    <>
      <Topbar title="Publish" />
      <main className="flex-1 p-6">
        <PublishClient />
      </main>
    </>
  );
}

