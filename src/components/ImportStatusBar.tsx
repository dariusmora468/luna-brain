/**
 * ImportStatusBar — shows which V2 data tabs are loaded.
 * Displayed in empty states so users can see at a glance what data is ready
 * in other views even when the current view has no data.
 */

export interface TabStatus {
  tab: string;
  label: string;
  count: number;
}

interface Props {
  tabs: TabStatus[];
}

export function ImportStatusBar({ tabs }: Props) {
  if (tabs.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <span
          key={t.tab}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
            t.count > 0
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-gray-100 text-gray-400 border border-gray-200"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${t.count > 0 ? "bg-green-500" : "bg-gray-300"}`} />
          {t.label}
          {t.count > 0 ? (
            <span className="font-semibold">{t.count}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </span>
      ))}
    </div>
  );
}
