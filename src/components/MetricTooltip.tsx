"use client";

import { DICTIONARY } from "@/lib/v2/dictionary";

interface MetricTooltipProps {
  metricKey: string;
}

/**
 * Renders a small ❓ circle next to a metric label.
 * On hover, shows a popover with the metric's definition, source,
 * and any approx/provisional flags drawn from the central DICTIONARY.
 *
 * Usage:
 *   <span>CPI <MetricTooltip metricKey="cpi_adjust" /></span>
 */
export function MetricTooltip({ metricKey }: MetricTooltipProps) {
  const def = DICTIONARY[metricKey];
  if (!def) return null;

  return (
    <span className="relative group inline-flex items-center align-middle ml-1">
      {/* Trigger — small grey circle with ? */}
      <span className="w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold inline-flex items-center justify-center cursor-help select-none leading-none">
        ?
      </span>

      {/* Popover — shown on hover via group-hover */}
      <div
        className={[
          "absolute bottom-5 left-0 z-50",
          "hidden group-hover:block",
          "w-72 rounded-xl bg-gray-900 text-white shadow-xl",
          "p-3 text-xs",
          // prevent popover from going off right edge when near right margin
          "max-w-[calc(100vw-2rem)]",
        ].join(" ")}
      >
        {/* Label */}
        <p className="font-semibold text-white mb-1">{def.label}</p>

        {/* Definition */}
        <p className="text-gray-300 leading-relaxed">{def.definition}</p>

        {/* Source */}
        <p className="text-gray-400 mt-2">
          <span className="font-medium text-gray-300">Source:</span> {def.source}
        </p>

        {/* Approx badge */}
        {def.approx && (
          <p className="text-orange-400 mt-1.5 font-medium">~approx — not an exact figure</p>
        )}

        {/* Provisional rule */}
        {def.provisional_rule && (
          <p className="text-yellow-400 mt-1">
            <span className="font-medium">Provisional when:</span> {def.provisional_rule}
          </p>
        )}
      </div>
    </span>
  );
}
