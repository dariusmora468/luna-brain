"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { value: "all", label: "All", bg: "bg-gray-100", text: "text-gray-600" },
  { value: "campaign", label: "Campaign", bg: "bg-pink-50", text: "text-pink-600" },
  { value: "paywall", label: "Paywall", bg: "bg-emerald-50", text: "text-emerald-600" },
  { value: "product", label: "Product", bg: "bg-blue-50", text: "text-blue-600" },
  { value: "aso", label: "ASO", bg: "bg-purple-50", text: "text-purple-600" },
  { value: "growth", label: "Growth", bg: "bg-amber-50", text: "text-amber-600" },
  { value: "other", label: "Other", bg: "bg-gray-100", text: "text-gray-500" },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  campaign: { bg: "bg-pink-50", text: "text-pink-600" },
  paywall: { bg: "bg-emerald-50", text: "text-emerald-600" },
  product: { bg: "bg-blue-50", text: "text-blue-600" },
  aso: { bg: "bg-purple-50", text: "text-purple-600" },
  growth: { bg: "bg-amber-50", text: "text-amber-600" },
  other: { bg: "bg-gray-100", text: "text-gray-500" },
};

interface Activity {
  id: number;
  date: string;
  category: string;
  title: string;
  description: string | null;
  auto_detected: boolean;
  created_by: string | null;
  created_at: string;
}

interface Props {
  initialActivities: Activity[];
}

function formatTimelineDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function groupByDate(activities: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {};
  for (const a of activities) {
    if (!groups[a.date]) groups[a.date] = [];
    groups[a.date].push(a);
  }
  return groups;
}

export default function TimelineView({ initialActivities }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formCategory, setFormCategory] = useState("growth");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCreatedBy, setFormCreatedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = activities.filter((a) => {
    if (filter !== "all" && a.category !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !(a.description || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const grouped = groupByDate(filtered);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          category: formCategory,
          title: formTitle,
          description: formDescription || null,
          created_by: formCreatedBy || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create activity");
      }

      const { activity } = await res.json();
      setActivities((prev) => [activity, ...prev]);
      setFormTitle("");
      setFormDescription("");
      setShowForm(false);

      startTransition(() => router.refresh());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-30" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Activity Timeline</h1>
            <p className="text-xs text-gray-400">{activities.length} events logged</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg"
            style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}
          >
            {showForm ? "Cancel" : "+ Log Activity"}
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Add activity form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-amber-100" style={{ boxShadow: "var(--shadow-md)" }}>
            <h3 className="text-sm font-semibold text-amber-600 mb-4">Log New Activity</h3>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                >
                  {CATEGORIES.filter(c => c.value !== "all").map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-500 font-medium mb-1">What happened?</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Launched US TikTok campaign, Changed paywall pricing..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-500 font-medium mb-1">Details (optional)</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Add any additional context..."
                rows={2}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none transition-all"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 font-medium mb-1">Your name (optional)</label>
                <input
                  type="text"
                  value={formCreatedBy}
                  onChange={(e) => setFormCreatedBy(e.target.value)}
                  placeholder="e.g., Darius"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !formTitle}
                className="mt-5 px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  filter === c.value
                    ? `${c.bg} ${c.text} ring-1 ring-current`
                    : "text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-50"
                }`}
                style={filter !== c.value ? { boxShadow: "0 1px 2px rgba(0,0,0,0.04)" } : undefined}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activities..."
              className="w-full sm:max-w-xs bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
            />
          </div>
        </div>

        {/* Timeline */}
        {sortedDates.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 mb-3">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium mb-2">No activities yet</p>
            <p className="text-xs text-gray-400">Start logging what changes in your business — campaigns, paywall tests, product releases, and more.</p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}
              >
                Log your first activity
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

            <div className="space-y-8">
              {sortedDates.map((date) => (
                <div key={date} className="relative">
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-amber-200 flex items-center justify-center z-10 relative" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700">{formatTimelineDate(date)}</h3>
                    <a
                      href={`/dashboard?date=${date}`}
                      className="text-[10px] text-amber-500/70 hover:text-amber-600 font-medium transition-colors"
                    >
                      View metrics →
                    </a>
                  </div>

                  {/* Activities for this date */}
                  <div className="ml-12 space-y-2">
                    {grouped[date].map((activity) => {
                      const style = CATEGORY_STYLES[activity.category] || CATEGORY_STYLES.other;
                      return (
                        <div
                          key={activity.id}
                          className="bg-white rounded-xl p-4 hover:shadow-md transition-all duration-200"
                          style={{ boxShadow: "var(--shadow-sm)" }}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${style.bg} ${style.text} flex-shrink-0 mt-0.5`}>
                              {activity.category}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 font-medium">{activity.title}</p>
                              {activity.description && (
                                <p className="text-xs text-gray-400 mt-1">{activity.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                                {activity.created_by && <span>by {activity.created_by}</span>}
                                {activity.auto_detected && (
                                  <span className="px-1.5 py-0.5 rounded-lg bg-gray-100 text-gray-400">auto-detected</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
