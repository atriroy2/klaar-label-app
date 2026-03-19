"use client";

import ChatBotPanel from "@/components/chatbot/ChatBotPanel";

export default function ChatBotPage() {
  return (
    <div style={{ height: "calc(100vh - 3rem)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <ChatBotPanel />
    </div>
  );
}
