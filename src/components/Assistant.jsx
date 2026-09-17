import { useEffect, useRef, useState } from "react";
import { incrementCounter } from "../utils/activityLog.js";

const API_URL = "http://localhost:3000/api/chat";

export default function Assistant({ masterBOM = [], builtFiles = [] }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Namaste! Main BOM MASTER PRO Assistant hoon. Aap BOM, Item Code, Part Name, QPS ya kisi bhi related information ke baare mein pooch sakte ho.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const checkServer = async () => {
    try {
      const response = await fetch("http://localhost:3000/", {
        method: "GET",
      });
      setOnline(response.ok);
    } catch {
      setOnline(false);
    }
  };

  useEffect(() => {
    checkServer();
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [
      ...messages,
      { role: "user", text },
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      // Keep the request small: the MY-PERSONAL-AI backend
      // remains the main AI + Google Drive/RAG/BOM data layer.
      const history = nextMessages
        .slice(-12)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history,
          source: "BOM_MASTER_PRO",
          masterBomCount: masterBOM.length,
          masterBomModels: builtFiles.map((b) => b.model),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.details || data.error || "AI request failed."
        );
      }

      setOnline(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply || "AI ne koi response nahi diya.",
        },
      ]);
    } catch (error) {
      setOnline(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "Assistant server se connect nahi ho pa raha.\n\n" +
            "Please MY-PERSONAL-AI backend check karo:\n" +
            "http://localhost:3000\n\n" +
            `Error: ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        text: "Chat cleared. What would you like to know about BOM?",
      },
    ]);
  };

  return (
    <section className="assistant-page">
      <div className="assistant-card">
        <div className="assistant-head">
  
            <h2>🤖 Assistant</h2>

          <div className="assistant-head-actions">
            <span
              className={
                "assistant-status " +
                (online === true
                  ? "online"
                  : online === false
                  ? "offline"
                  : "")
              }
            >
              {online === true
                ? "● Online"
                : online === false
                ? "● Offline"
                : "● Checking..."}
            </span>

            <button
              className="secondary"
              onClick={clearChat}
              disabled={loading}
            >
              Clear Chat
            </button>
          </div>
        </div>

        <div className="assistant-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                "assistant-message " +
                (message.role === "user" ? "user" : "bot")
              }
            >
              <div className="assistant-message-label">
                {message.role === "user" ? "You" : "Assistant"}
              </div>
              <div className="assistant-message-text">
                {message.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="assistant-message bot">
              <div className="assistant-message-label">Assistant</div>
              <div className="assistant-message-text">
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="assistant-composer">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the assistant something..."
            rows={2}
            disabled={loading}
          />

          <button
            className="primary assistant-send"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>

        <p className="assistant-note">
          Enter = Send • Shift + Enter = New line
        </p>
      </div>
    </section>
  );
}
