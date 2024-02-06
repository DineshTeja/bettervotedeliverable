import React from "react";
import { Message } from "@/datasources/messagesContext";

export default function ChatView({ message }: { message: Message }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="font-semibold text-sm text-slate-700">
        {message.sender === "user" ? "You" : "BetterVote"}
      </div>
      <div className="text-slate-800 text-sm">{message.text}</div>
    </div>
  );
}
