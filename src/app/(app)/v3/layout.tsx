"use client";

import { usePathname } from "next/navigation";

const NAV = [
  { label: "Dashboard", href: "/v3/dashboard" },
  { label: "Metrics", href: "/v3/metrics" },
  { label: "Experiments", href: "/v3/experiments" },
];

export default function V3Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      {/* V3 sub-nav */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.03)" }}>
        <div className="flex items-center px-4 lg:px-6 h-12 gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  active
                    ? "text-violet-700"
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                }`}
                style={active ? { background: "rgba(139,92,246,0.08)" } : undefined}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
