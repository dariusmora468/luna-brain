"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "What was our best day for trials last week?",
  "Compare US vs UK performance",
  "Why did CPI change recently?",
  "What's our current install-to-trial conversion?",
  "Should we scale US spend based on the data?",
  "Summarize this week's performance",
];

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [thinkingPhase, setThinkingPhase] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || loading) return;

    const userMessage: Message = { role: "user", content: question.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setStreamingText("");

    // Thinking phases for the progress indicator
    const phases = [
      "Loading metrics data...",
      "Analyzing trends...",
      "Cross-referencing timeline...",
      "Generating insights...",
    ];
    let phaseIndex = 0;
    setThinkingPhase(phases[0]);
    const phaseInterval = setInterval(() => {
      phaseIndex = Math.min(phaseIndex + 1, phases.length - 1);
      setThinkingPhase(phases[phaseIndex]);
    }, 1500);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          history: messages,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      clearInterval(phaseInterval);
      setThinkingPhase("");

      // Read the stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullText += data.text;
                setStreamingText(fullText);
              }
              if (data.done) {
                // Stream complete
              }
            } catch {
              // Skip unparseable
            }
          }
        }
      }

      // Finalize message
      if (fullText) {
        setMessages(prev => [...prev, { role: "assistant", content: fullText }]);
      }
    } catch (err) {
      console.error("Ask error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I couldn't process that question. Please try again.",
      }]);
    } finally {
      clearInterval(phaseInterval);
      setLoading(false);
      setStreamingText("");
      setThinkingPhase("");
      inputRef.current?.focus();
    }
  }, [loading, messages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8F5F0" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md border-b border-gray-100" style={{ background: "rgba(248,245,240,0.92)" }}>
        <div className="px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Ask Luna Brain</h1>
            <p className="text-xs text-gray-400">AI analyst powered by your real metrics data</p>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1))" }}>
                <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Ask anything about Luna</h2>
              <p className="text-sm text-gray-400 text-center max-w-md mb-8">
                I have access to all your metrics data, campaign history, and timeline events. Ask me about performance, trends, or strategy.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left px-4 py-3 bg-white border border-gray-200 hover:border-amber-300 hover:bg-amber-50 rounded-xl text-sm text-gray-600 hover:text-amber-700 transition-all duration-200"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <div key={i} className={`mb-6 ${msg.role === "user" ? "flex justify-end" : ""}`}>
              {msg.role === "user" ? (
                <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-md text-sm text-white" style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}>
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-full">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15))" }}>
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-sm text-gray-700 leading-relaxed prose-compact">
                      <FormattedResponse text={msg.content} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Streaming response */}
          {loading && (
            <div className="mb-6">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15))" }}>
                  <svg className="w-4 h-4 text-amber-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="flex-1">
                  {streamingText ? (
                    <div className="text-sm text-gray-700 leading-relaxed prose-compact">
                      <FormattedResponse text={streamingText} />
                      <span className="inline-block w-1.5 h-4 bg-amber-400 animate-pulse ml-0.5 align-middle rounded-sm" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* Progress bar */}
                      <div className="flex-1 max-w-xs">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              background: "linear-gradient(90deg, #F59E0B, #F97316)",
                              width: thinkingPhase.includes("Loading") ? "25%" :
                                     thinkingPhase.includes("Analyzing") ? "50%" :
                                     thinkingPhase.includes("Cross") ? "75%" : "90%",
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">{thinkingPhase}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="sticky bottom-0 border-t border-gray-100" style={{ background: "rgba(248,245,240,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about Luna's performance..."
              disabled={loading}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Powered by Claude Sonnet, reading {"{"}your actual metrics data{"}"}. Answers may take a few seconds.
          </p>
        </div>
      </div>
    </div>
  );
}

// Simple markdown-like formatter for AI responses
function FormattedResponse({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="font-bold text-gray-800 mt-4 mb-1 text-sm">{line.slice(4)}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="font-bold text-gray-800 mt-4 mb-1">{line.slice(3)}</h3>);
    } else if (line.startsWith("# ")) {
      elements.push(<h2 key={i} className="font-bold text-gray-900 mt-4 mb-2 text-base">{line.slice(2)}</h2>);
    }
    // Bullet points
    else if (line.match(/^[-*] /)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-amber-500 mt-0.5">•</span>
          <span><InlineFormat text={line.slice(2)} /></span>
        </div>
      );
    }
    // Numbered lists
    else if (line.match(/^\d+\. /)) {
      const match = line.match(/^(\d+)\. (.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-2 ml-1 my-0.5">
            <span className="text-amber-600 font-semibold min-w-[1.2rem]">{match[1]}.</span>
            <span><InlineFormat text={match[2]} /></span>
          </div>
        );
      }
    }
    // Empty lines
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular text
    else {
      elements.push(<p key={i} className="my-0.5"><InlineFormat text={line} /></p>);
    }
  }

  return <>{elements}</>;
}

// Bold and inline code formatting
function InlineFormat({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|£[\d,.]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-gray-800">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="bg-amber-50 text-amber-700 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
        }
        if (part.match(/^£[\d,.]+$/)) {
          return <span key={i} className="font-semibold text-emerald-600">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
