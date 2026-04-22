import { Topbar } from "@/components/layout/Topbar";
import { ChatClient } from "./ChatClient";

export default function ChatPage() {
  return (
    <>
      <Topbar title="Chat" />
      <main className="flex-1 p-6">
        <ChatClient />
      </main>
    </>
  );
}

