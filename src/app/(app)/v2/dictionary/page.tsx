"use client";

import { useState, useMemo } from "react";
import { DICTIONARY, MetricDefinition } from "@/lib/v2/dictionary";

type GroupKey = MetricDefinition["group"];

const GROUP_LABELS: Record<GroupKey, string> = {
  daily: "Daily Metrics",
  weekly: "Weekly Metrics",
  monthly_company: "Monthly — Company",
  monthly_teen: "Monthly — Teen",
  monthly_parent: "Monthly — Parent",
};

const GROUP_ORDER: GroupKey[] = [
  "daily",
  "weekly",
  "monthly_company",
  "monthly_teen",
  "monthly_parent",
];

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
      {source}
    </span>
  );
}

function ApproxBadge() {
  return (
    <span className="inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 ml-1">
      ~approx
    </span>
  );
}

function ProvisionalNote({ rule }: { rule: string }) {
  return (
    <p className="mt-1 text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5">
      Provisional when: {rule}
    </p>
  );
}

interface MetricCardProps {
  metricKey: string;
  def: MetricDefinition;
}

function MetricCard({ metricKey, def }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{def.label}</h3>
          <code className="text-[10px] text-gray-400 font-mono">{metricKey}</code>
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <SourceBadge source={def.source} />
          {def.approx && <ApproxBadge />}
        </div>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{def.definition}</p>
      {def.provisional_rule && <ProvisionalNote rule={def.provisional_rule} />}
    </div>
  );
}

export default function DictionaryPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return Object.entries(DICTIONARY);
    return Object.entries(DICTIONARY).filter(([key, def]) => {
      return (
        key.includes(q) ||
        def.label.toLowerCase().includes(q) ||
        def.definition.toLowerCase().includes(q) ||
        def.source.toLowerCase().includes(q)
      );
    });
  }, [query]);

  // Group filtered results
  const grouped = useMemo(() => {
    const map = new Map<GroupKey, [string, MetricDefinition][]>();
    for (const group of GROUP_ORDER) map.set(group, []);
    for (const [key, def] of filtered) {
      map.get(def.group)?.push([key, def]);
    }
    return map;
  }, [filtered]);

  const totalCount = Object.keys(DICTIONARY).length;
  const filteredCount = filtered.length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">V2</span>
          <span className="text-xs text-gray-300">/</span>
          <span className="text-xs text-gray-400">Data Dictionary</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Data Dictionary</h1>
        <p className="text-sm text-gray-500 mt-1">
          Definitions, sources, and caveats for every metric in the luna dashboard.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder="Search metrics, definitions, or sources…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
          />
        </div>
        {query && (
          <p className="text-xs text-gray-400 mt-1.5 ml-1">
            {filteredCount} of {totalCount} metrics match &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {/* Badge legend */}
      <div className="flex flex-wrap gap-3 mb-8 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">~approx</span>
          <span className="text-gray-400">Not an exact figure — uses heuristics or attribution proxies</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">provisional</span>
          <span className="text-gray-400">Needs data maturation before fully reliable</span>
        </span>
      </div>

      {/* Groups */}
      {GROUP_ORDER.map((group) => {
        const entries = grouped.get(group) ?? [];
        if (entries.length === 0) return null;
        return (
          <section key={group} className="mb-10">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              {GROUP_LABELS[group]}
              <span className="text-xs font-normal text-gray-400">({entries.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {entries.map(([key, def]) => (
                <MetricCard key={key} metricKey={key} def={def} />
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">No metrics match &ldquo;{query}&rdquo;.</p>
          <button
            onClick={() => setQuery("")}
            className="mt-2 text-amber-600 text-xs font-semibold hover:underline"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
