import React, { useState } from "react";
import { Message } from "@/datasources/messagesContext";

export default function ChatView({ message }: { message: Message }) {
  // State variable for expanding list of names/tiers
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine if the message contains names with tiers or just names
  const isNamesWithTiersArray = Array.isArray(message.text) && message.text.every(item => typeof item === 'object' && 'name' in item && 'tier' in item);
  // const hasAdditionalText = typeof message.additionalText === 'string';
  const hasAdditionalText = typeof (message as any).additionalText === 'string';

  const visibleItemCount = 10; // Adjust this number as needed

  // Sort the names so that names with non-empty tiers appear first
  const sortedNamesWithTiers = isNamesWithTiersArray ? message.text.sort((a, b) => {
    if (a.tier && !b.tier) {
      return -1;
    } else if (!a.tier && b.tier) {
      return 1;
    }
    return 0;
  }) : [];

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Render the sender label */}
      <div className="font-semibold text-sm text-slate-700">
        {message.sender === "user" ? "You" : "BetterVote"}
      </div>
      {/* Check if the message contains names with tiers */}
        {isNamesWithTiersArray ? (
        <>
          {sortedNamesWithTiers.slice(0, isExpanded ? sortedNamesWithTiers.length : visibleItemCount).map((item, index) => (
            <div key={index} className="bg-gray-100 text-gray-800 p-2 rounded-xl my-0.5">
              <strong>{item.name}</strong>{item.tier !== "" ? ` - ${item.tier}` : ""}
            </div>
          ))}
          {sortedNamesWithTiers.length > visibleItemCount && (
            <button
              className="mt-2 text-blue-500 hover:text-blue-700"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Show Less" : `Show More (${sortedNamesWithTiers.length - visibleItemCount} more)`}
            </button>
          )}
        </>
      ) : hasAdditionalText ? (
        // Render the additional text if no names are identified and additional text exists
        <div className="text-slate-800 text-md">{message.additionalText}</div>
      ) : (
        // Render the regular text message if no names and no additional text
        // Assuming message.text is a string here. If it's not, you might need to adjust.
        <div className="text-slate-800 text-md">{message.text}</div>
      )}
    </div>
  );
}