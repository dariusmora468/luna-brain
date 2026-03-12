"use client";

import { usePathname } from "next/navigation";
import V2Toggle from "@/components/V2Toggle";

const NAV = [
  { label: "Metrics", href: "/v3/metrics", icon: "📐" },
  { label: "Experiments", href: "/v3/experiments", icon: "🧪" },
];

export default function V3Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      {/* V3 Top Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          {/* Left: V3 nav tabs */}
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    active
                      ? "text-violet-700"
                      : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                  style={active ? { background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(109,40,217,0.08))" } : undefined}
                >
                  <span>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Right: version toggle */}
          <V2Toggle />
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
