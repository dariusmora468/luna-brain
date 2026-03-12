"use client";

import { useState, useMemo, useRef } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { ExperimentRow } from "@/lib/v2/parsers";
import { ImportStatusBar } from "@/components/ImportStatusBar";
import type { TabStatus } from "@/components/ImportStatusBar";

interface Props {
  experiments: ExperimentRow[];
  importStatus?: TabStatus[];
}

const STATUS_COLORS: Record<string, string> = {
  Done: "#9CA3AF",       // gray-400
  Running: "#F59E0B",    // amber-500
  "Not Started": "#60A5FA", // blue-400
};

const STATUS_BG: Record<string, string> = {
  Done: "bg-gray-100 text-gray-600",
  Running: "bg-amber-100 text-amber-700",
  "Not Started": "bg-blue-100 text-blue-700",
};

const DECISION_BADGE: Record<string, string> = {
  Applied: "bg-green-100 text-green-700",
  "Not Applied": "bg-gray-100 text-gray-500",
  TBD: "bg-yellow-100 text-yellow-700",
};

// Parse a YYYY-MM-DD date to a numeric timestamp for Recharts
function dateToMs(d: string | null): number | null {
  if (!d) return null;
  return new Date(d).getTime();
}

// Format a timestamp as "Jan 26" for axis labels
function msToLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

// Custom Gantt tooltip
function GanttTooltip({ active, payload }: { active?: boolean; payload?: { payload: ExperimentRow & { _start: number; _duration: number } }[] }) {
  if (!active || !payload?.[0]) return null;
  const exp = payload[0].payload;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-xs max-w-xs">
      <p className="font-semibold text-gray-900 mb-1">{exp.name}</p>
      <p className="text-gray-500">
        {exp.start_date} → {exp.end_date ?? "ongoing"}
        {exp.days_running !== null && ` (${exp.days_running}d)`}
      </p>
      {exp.result && <p className="text-gray-600 mt-1 line-clamp-2">{exp.result}</p>}
    </div>
  );
}

export default function ExperimentsView({ experiments, importStatus }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [segmentFilter, setSegmentFilter] = useState<string>("All");
  const [focusFilter, setFocusFilter] = useState<string>("All");
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Derive filter options
  const statuses = useMemo(
    () => ["All", ...Array.from(new Set(experiments.map((e) => e.status).filter(Boolean)))],
    [experiments]
  );
  const segments = useMemo(
    () => ["All", ...Array.from(new Set(experiments.map((e) => e.segment).filter(Boolean)))],
    [experiments]
  );
  const focusAreas = useMemo(
    () => ["All", ...Array.from(new Set(experiments.map((e) => e.focus_area).filter(Boolean)))],
    [experiments]
  );

  // Filtered experiments
  const filtered = useMemo(
    () =>
      experiments.filter((e) => {
        if (statusFilter !== "All" && e.status !== statusFilter) return false;
        if (segmentFilter !== "All" && e.segment !== segmentFilter) return false;
        if (focusFilter !== "All" && e.focus_area !== focusFilter) return false;
        return true;
      }),
    [experiments, statusFilter, segmentFilter, focusFilter]
  );

  // Gantt chart data
  const ganttData = useMemo(() => {
    const allDates = filtered
      .flatMap((e) => [dateToMs(e.start_date), dateToMs(e.end_date)])
      .filter(Boolean) as number[];

    const minDate = allDates.length ? Math.min(...allDates) : Date.now() - 180 * 86400000;
    const maxDate = allDates.length ? Math.max(...allDates) : Date.now();

    return {
      rows: filtered.map((e) => {
        const start = dateToMs(e.start_date) ?? minDate;
        const end = dateToMs(e.end_date) ?? Date.now();
        return {
          ...e,
          _start: start,
          _duration: Math.max(end - start, 86400000), // min 1 day
        };
      }),
      minDate,
      maxDate: Math.max(maxDate, Date.now()),
    };
  }, [filtered]);

  const handleBarClick = (data: { name: string }) => {
    setHighlighted(data.name);
    const el = cardRefs.current[data.name];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (experiments.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Experiment Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">No experiment data imported yet.</p>
        </div>
        {importStatus && importStatus.length > 0 && (
          <div className="mb-4">
            <ImportStatusBar tabs={importStatus} />
          </div>
        )}
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-3">Import the Experiment Log CSV to see your experiments here</p>
          <a href="/v2/import" className="text-amber-600 font-semibold text-sm hover:underline">
            Go to Import →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">V2</span>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs text-gray-400">Experiments</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Experiment Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            {experiments.length} total ·{" "}
            {experiments.filter((e) => e.status === "Running").length} running ·{" "}
            {experiments.filter((e) => e.status === "Done").length} done
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Status filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                statusFilter === s
                  ? s === "Running"
                    ? "bg-amber-500 text-white"
                    : s === "Done"
                    ? "bg-gray-500 text-white"
                    : s === "Not Started"
                    ? "bg-blue-400 text-white"
                    : "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Segment filter */}
        {segments.length > 2 && (
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600"
          >
            {segments.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}

        {/* Focus area filter */}
        {focusAreas.length > 2 && (
          <select
            value={focusFilter}
            onChange={(e) => setFocusFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600"
          >
            {focusAreas.map((f) => <option key={f}>{f}</option>)}
          </select>
        )}
      </div>

      {/* Gantt Chart */}
      {ganttData.rows.length > 0 && (
        <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Timeline</h2>
          <div style={{ height: Math.max(ganttData.rows.length * 28 + 40, 120) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={ganttData.rows}
                margin={{ top: 0, right: 20, bottom: 20, left: 140 }}
                barCategoryGap={4}
              >
                <XAxis
                  type="number"
                  domain={[ganttData.minDate, ganttData.maxDate]}
                  tickFormatter={msToLabel}
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  tickCount={6}
                  scale="time"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={136}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                />
                <Tooltip content={<GanttTooltip />} />
                {/* Today reference line */}
                <ReferenceLine x={Date.now()} stroke="#F59E0B" strokeDasharray="4 2" strokeWidth={1.5} />
                {/* Invisible base bar starting at minDate */}
                <Bar dataKey="_start" stackId="gantt" fill="transparent" />
                {/* Duration bar */}
                <Bar
                  dataKey="_duration"
                  stackId="gantt"
                  radius={[4, 4, 4, 4]}
                  onClick={(data) => handleBarClick(data as { name: string })}
                  cursor="pointer"
                >
                  {ganttData.rows.map((row) => (
                    <Cell
                      key={row.name}
                      fill={
                        highlighted === row.name
                          ? "#F97316"
                          : (STATUS_COLORS[row.status] ?? "#D1D5DB")
                      }
                      opacity={highlighted && highlighted !== row.name ? 0.4 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            <span className="inline-block w-4 h-0.5 bg-amber-400 mr-1 align-middle" />Today
          </p>
        </div>
      )}

      {/* Experiment Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((exp) => (
          <div
            key={exp.name}
            ref={(el) => { cardRefs.current[exp.name] = el; }}
            className={`bg-white rounded-2xl p-5 shadow-sm border transition-all duration-200 ${
              highlighted === exp.name ? "border-amber-400 shadow-md" : "border-gray-100"
            }`}
            onClick={() => setHighlighted(highlighted === exp.name ? null : exp.name)}
          >
            {/* Card header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">{exp.name}</h3>
              <div className="flex gap-1 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BG[exp.status] ?? "bg-gray-100 text-gray-500"}`}>
                  {exp.status}
                </span>
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-3">
              {exp.start_date && (
                <span>
                  {exp.start_date} → {exp.end_date ?? "ongoing"}
                </span>
              )}
              {exp.days_running !== null && <span>{exp.days_running}d</span>}
              {exp.segment && (
                <span className="text-gray-500">{exp.segment}</span>
              )}
              {exp.focus_area && (
                <span className="text-gray-500">{exp.focus_area}</span>
              )}
            </div>

            {/* Hypothesis */}
            {exp.hypothesis && (
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                <span className="font-medium text-gray-700">Hypothesis: </span>
                {exp.hypothesis}
              </p>
            )}

            {/* Metrics */}
            {(exp.variant_a_metric || exp.variant_b_metric) && (
              <div className="flex gap-3 mb-2">
                {exp.variant_a_metric && (
                  <div className={`flex-1 rounded-lg px-2 py-1.5 text-xs ${exp.winner === "A" ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
                    <span className="text-gray-400">A: </span>
                    <span className="font-semibold text-gray-700">{exp.variant_a_metric}</span>
                    {exp.winner === "A" && <span className="ml-1">✓</span>}
                  </div>
                )}
                {exp.variant_b_metric && (
                  <div className={`flex-1 rounded-lg px-2 py-1.5 text-xs ${exp.winner === "B" ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
                    <span className="text-gray-400">B: </span>
                    <span className="font-semibold text-gray-700">{exp.variant_b_metric}</span>
                    {exp.winner === "B" && <span className="ml-1">✓</span>}
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {exp.result && (
              <p className="text-xs text-gray-500 mb-2 line-clamp-2">{exp.result}</p>
            )}

            {/* Decision */}
            {exp.decision && exp.decision !== "TBD" && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DECISION_BADGE[exp.decision] ?? "bg-gray-100 text-gray-500"}`}>
                {exp.decision}
              </span>
            )}
            {exp.decision === "TBD" && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
                Decision TBD
              </span>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No experiments match the selected filters.
        </div>
      )}
    </div>
  );
}
