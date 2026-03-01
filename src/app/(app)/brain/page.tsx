"use client";

import { useState } from "react";

const PLACEHOLDER_DOCS = [
  { id: 1, title: "luna Growth Strategy Q1 2026", source: "notion", updated: "2 days ago", snippet: "Our primary growth lever remains TikTok paid acquisition with a focus on the US market..." },
  { id: 2, title: "Paywall A/B Test Results — Feb 2026", source: "google", updated: "5 days ago", snippet: "Variant B (annual-first) is outperforming the control by 30% on trial conversion rate..." },
  { id: 3, title: "Product Roadmap H1 2026", source: "notion", updated: "1 week ago", snippet: "Key priorities: onboarding flow v3, journal feature, parental dashboard, ASO optimisation..." },
  { id: 4, title: "Investor Update — January 2026", source: "uploaded", updated: "1 month ago", snippet: "MRR grew 22% month-over-month, primarily driven by US expansion and paywall optimization..." },
  { id: 5, title: "TikTok Creative Guidelines", source: "uploaded", updated: "2 weeks ago", snippet: "Top performing formats: problem→solution hooks, social proof testimonials, before/after..." },
];

const SOURCE_ICONS: Record<string, { bg: string; text: string; label: string }> = {
  notion: { bg: "bg-gray-100", text: "text-gray-700", label: "N" },
  google: { bg: "bg-blue-50", text: "text-blue-600", label: "G" },
  uploaded: { bg: "bg-amber-50", text: "text-amber-600", label: "↑" },
};

const PLACEHOLDER_INSIGHTS = [
  {
    title: "US expansion ROI is ahead of plan",
    description: "Cross-referencing the growth strategy doc with the last 14 days of metrics: US CPI has averaged £0.48 vs the £0.65 target. Trial-to-sub conversion is tracking at 4.8%, beating the 3.5% projection. The unit economics support accelerating US spend.",
    connections: ["Growth Strategy Q1 2026", "Metrics: Feb 13-27", "Activity: US Campaign Launch"],
  },
  {
    title: "Paywall test aligns with pricing strategy hypothesis",
    description: "The A/B test results show annual-first positioning converts 30% better, which validates the hypothesis in the Q1 strategy doc about value perception. Consider making Variant B the default and running a follow-up test on price points.",
    connections: ["Paywall A/B Test Results", "Growth Strategy Q1 2026", "Activity: A/B Test Start"],
  },
];

export default function BrainPage() {
  const [activeTab, setActiveTab] = useState<"docs" | "chat" | "insights">("docs");
  const [chatInput, setChatInput] = useState("");

  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-30" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="px-6 py-4">
          <h1 className="text-lg font-bold text-gray-900">Knowledge Base & AI Brain</h1>
          <p className="text-xs text-gray-400">Your company&apos;s central intelligence hub</p>
        </div>
        <div className="px-6 flex gap-1">
          {(["docs", "chat", "insights"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all duration-200 ${
                activeTab === tab
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab === "docs" ? "Documents" : tab === "chat" ? "AI Chat" : "Strategic Insights"}
            </button>
          ))}
        </div>
      </header>

      <div className="p-6">
        {/* Documents Tab */}
        {activeTab === "docs" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                style={{ boxShadow: "var(--shadow-sm)" }}
              />
            </div>

            {/* Coming soon badge */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-amber-700 font-semibold">Connect your knowledge sources</p>
                <p className="text-xs text-amber-600/70 mt-1">Notion, Google Docs, and file uploads coming soon. Below is a preview of what this will look like.</p>
              </div>
            </div>

            {/* Document cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PLACEHOLDER_DOCS.map((doc) => {
                const sourceStyle = SOURCE_ICONS[doc.source] || SOURCE_ICONS.uploaded;
                return (
                  <div key={doc.id} className="bg-white rounded-2xl p-5 hover:shadow-md transition-all duration-200 cursor-pointer group" style={{ boxShadow: "var(--shadow-sm)" }}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl ${sourceStyle.bg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-xs font-bold ${sourceStyle.text}`}>{sourceStyle.label}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-800 group-hover:text-amber-600 transition-colors truncate">{doc.title}</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">Updated {doc.updated}</p>
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{doc.snippet}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Chat Tab */}
        {activeTab === "chat" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
              {/* Chat messages area */}
              <div className="p-8 min-h-[400px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}>
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">luna Brain AI</h2>
                <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                  AI Brain is being connected. Coming soon — ask questions about your data, get instant answers.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {[
                    "What was our best day for trials last week?",
                    "Compare US vs UK performance since launch",
                    "What's our ROAS trend — should we scale spend?",
                    "Summarize recent product decisions and impact",
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setChatInput(q)}
                      className="text-left px-3 py-2 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-200 rounded-xl text-xs text-gray-600 hover:text-amber-700 transition-all duration-200"
                    >
                      &ldquo;{q}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              {/* Input bar */}
              <div className="border-t border-gray-100 p-4" style={{ background: "#FAFAF8" }}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask anything about your business..."
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                  />
                  <button
                    disabled
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white/70 cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #F59E0B80, #F9731680)" }}
                  >
                    Send
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">AI chat will be connected in v2 — with access to your metrics, timeline, and knowledge base</p>
              </div>
            </div>
          </div>
        )}

        {/* Strategic Insights Tab */}
        {activeTab === "insights" && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-purple-700 font-semibold">Strategic insights preview</p>
                <p className="text-xs text-purple-600/70 mt-1">These insights will be AI-generated in v2 by connecting dots across your metrics, timeline, and documents. Below is a preview.</p>
              </div>
            </div>

            {PLACEHOLDER_INSIGHTS.map((insight, i) => (
              <div key={i} className="bg-white rounded-2xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">{insight.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{insight.description}</p>
                <div className="flex flex-wrap gap-2">
                  {insight.connections.map((c, j) => (
                    <span key={j} className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[10px] text-gray-500 font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
