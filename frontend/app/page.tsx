"use client";

import React, { useEffect, useRef, useState } from "react";
import ChatInput from "./components/ChatInput";
import StreamRenderer from "./components/StreamRenderer";
import { queryItem } from "../utils/api";

type Message = {
  id: string;
  role: "user" | "ai";
  text?: string;
  jobId?: string;
};

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "ai", text: "What’s on the agenda today?" },
  ]);

  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (text: string) => {
    if (!text.trim()) return;

    const userId = `u_${Date.now()}`;
    setMessages((prev) => [...prev, { id: userId, role: "user", text }]);

    setLoading(true);

    const res = await queryItem(text);
    if (res?.job_id) {
      setMessages((prev) => [
        ...prev,
        { id: `ai_${res.job_id}`, role: "ai", jobId: res.job_id },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "ai",
          text: "⚠️ Server error.",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0d0f] text-white">
      {/* TOP CENTER TITLE */}
      <div className="pt-12 pb-4 text-center">
        <h1 className="text-4xl font-bold">AI Item Factor Analyzer</h1>
        <p className="mt-1 text-white/60">
          ChatGPT-style — AI on left, You on right
        </p>
      </div>

      {/* CHAT AREA */}
      <main className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full max-w-4xl px-6 pb-40 mx-auto space-y-6 overflow-y-auto"
        >
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-gradient-to-br from-blue-500 to-sky-500 text-black px-5 py-3 rounded-2xl max-w-[75%] shadow">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <div className="bg-[#141416] rounded-2xl border border-white/10 p-4 max-w-[95%] shadow">
                  {msg.jobId ? (
                    <StreamRenderer jobId={msg.jobId} />
                  ) : (
                    <div className="text-white/90">{msg.text}</div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </main>

      {/* FIXED BOTTOM INPUT */}
      <footer className="fixed bottom-0 left-0 right-0 flex justify-center py-4 bg-[#0d0d0f]/80 backdrop-blur-lg border-t border-white/10">
        <div className="w-full max-w-4xl px-4">
          <ChatInput onSubmit={handleSubmit} disabled={loading} />
        </div>
      </footer>
    </div>
  );
}
