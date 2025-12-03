"use client";
import React, { useState } from "react";

export default function ChatInput({ onSubmit, disabled }: any) {
  const [value, setValue] = useState("");

  const send = () => {
    if (!value.trim()) return;
    onSubmit(value);
    setValue("");
  };

  return (
    <div className="flex items-center w-full gap-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        disabled={disabled}
        placeholder="Ask anything…"
        className="flex-1 px-6 py-4 bg-[#1a1b1e] border border-white/10 text-white rounded-2xl placeholder-white/40 focus:border-white/20 transition"
      />

      <button
        onClick={send}
        disabled={disabled}
        className="px-6 py-3 font-semibold text-black rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500"
      >
        Ask
      </button>
    </div>
  );
}
