"use client";
import ReactTextareaAutosize from "react-textarea-autosize";
import {
  ChevronRightIcon,
  Square,
  StopCircle,
  StopCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import MessagesProvider, { useMessages } from "@/datasources/messagesContext";
import { v4 as uuidv4 } from "uuid";
import ChatView from "@/components/ui/chatView";
import axios from 'axios'; // Assuming you're using axios for HTTP requests

function View() {
  const [isAnswering, setIsAnswering] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { messages, addMessage } = useMessages();

  const handleSubmit = async () => {
    if (chatInput.trim() === "") return;
    setChatInput("");

    setIsAnswering(true);

    console.log("Adding", chatInput, "to messages.");

    addMessage({
      id: uuidv4(),
      text: chatInput,
      timestamp: Date.now(),
      sender: "user",
    }, "new");

    try {
      const searchQuery = `${chatInput} donor`;
      const response = await axios.get(`https://api.scrape-it.cloud/scrape/google?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'x-api-key':  process.env.NEXT_PUBLIC_SCRAPE_IT_API_KEY, // Use your actual Scrape It API key
          'Content-Type' : 'application/json'
        }
      });

      const keywords = ["supporters","donor", "fundraise", "funds", "donations", "donate", "support", "giving", "donate"];
      let foundRelevantLink = false;
      let messageText = "No relevant donation link found.";

      const firstThreeResults = response.data.organicResults.slice(0, 3);
      for (const result of firstThreeResults) {
        if (keywords.some(keyword => result.title.toLowerCase().includes(keyword) || result.link.toLowerCase().includes(keyword))) {
          messageText = `${result.title} - ${result.link}`;
          foundRelevantLink = true;

          // If a relevant link is found, send it to the server for name scraping
          try {
            console.log("made it");
            const namesResponse = await fetch('http://localhost:8080/scrape-names', {
              method: "POST",
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ url: result.link }) // Correctly include the URL in the request body
            });        
          } catch (scrapeError) {
            console.error("Error scraping names:", scrapeError);
            messageText += ". Error occurred while scraping names.";
          }
          break; // Stop searching once a match is found
        }
      }

      addMessage({
        id: uuidv4(),
        text: messageText,
        timestamp: Date.now(),
        sender: "ai",
      }, "new");
    } catch (error) {
      console.error("Error fetching search results:", error);
      addMessage({
        id: uuidv4(),
        text: "Failed to fetch search results.",
        timestamp: Date.now(),
        sender: "ai",
      }, "new");
    }

    setIsAnswering(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <main className="flex h-screen flex-col items-center justify-between py-12 px-16 gap-8">
      {/* Main content */}
      <div className="flex flex-col w-full overflow-scroll">
        {/* Title card */}
        <div className="flex flex-col items-center gap-1 p-12">
          <div className="font-extrabold text-3xl text-slate-800">
            BetterVote
          </div>
          <div className="text-slate-500 font-medium">
            Finding thousands of potential campaign donors in seconds. 
          </div>
        </div>

        {/* Chat view */}
        <div className="flex flex-col gap-6 w-full">
          {messages.map((message) => (
            <ChatView key={message.id} message={message} />
          ))}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Text input */}
      <div className="flex flex-row gap-2 w-full border border-slate-200 rounded-xl bg-white">
        <ReactTextareaAutosize
          placeholder="Scrape with BetterVote"
          value={chatInput}
          disabled={isAnswering}
          onChange={(e) => setChatInput(e.target.value)}
          className="resize-none w-full text-sm p-3 bg-transparent focus:outline-none"
          maxRows={6}
          maxLength={1024}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-full aspect-square rounded-xl transition-all"
          onClick={() => handleSubmit()}
        >
          {isAnswering ? (
            <StopCircleIcon className="text-slate-600" />
          ) : (
            <ChevronRightIcon className="text-teal-600" />
          )}
        </Button>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <MessagesProvider>
      <View />
    </MessagesProvider>
  );
}
