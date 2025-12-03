// app/components/ChatMessage.tsx
"use client";

import React from "react";

export default function ChatMessage({
  role,
  children,
}: {
  role: "user" | "ai";
  children: React.ReactNode;
}) {
  const isUser = role === "user";

  return (
    <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "px-4 py-3 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 text-black max-w-[75%] shadow-lg"
            : "px-4 py-3 rounded-2xl bg-[#1b1c1f] border border-white/5 max-w-[85%] shadow-sm text-white"
        }
      >
        {children}
      </div>
    </div>
  );
}
