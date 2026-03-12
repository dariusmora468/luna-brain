"use client";

import { usePathname } from "next/navigation";
import V2Toggle from "@/components/V2Toggle";

const NAV = [
  { label: "Dashboard", href: "/v2/dashboard", icon: "📊" },
  { label: "Metrics", href: "/v2/metrics", icon: "📐" },
  { label: "Experiments", href: "/v2/experiments", icon: "🧪" },
  { label: "Weekly", href: "/v2/weekly", icon: "📅" },
  { label: "Monthly", href: "/v2/monthly", icon: "📈" },
  { label: "Import", href: "/v2/import", icon: "⬆️" },
  { label: "Data", href: "/v2/data", icon: "🗂️" },
  { label: "Dictionary", href: "/v2/dictionary", icon: "📖" },
];

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      {/* V2 Top Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          {/* Left: V2 nav tabs */}
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    active
                      ? "text-amber-700"
                      : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                  style={active ? { background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(249,115,22,0.08))" } : undefined}
                >
                  <span>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Right: V1/V2 toggle */}
          <V2Toggle />
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
