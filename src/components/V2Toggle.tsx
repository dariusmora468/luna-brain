"use client";

import { usePathname, useRouter } from "next/navigation";

export default function V2Toggle() {
  const pathname = usePathname();
  const router = useRouter();
  const isV2 = pathname.startsWith("/v2");

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100" style={{ fontSize: "12px" }}>
      <button
        onClick={() => !isV2 || router.push("/dashboard")}
        className={`px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 ${
          !isV2
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        V1
      </button>
      <button
        onClick={() => isV2 || router.push("/v2/dashboard")}
        className={`px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 ${
          isV2
            ? "text-white shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        }`}
        style={isV2 ? { background: "linear-gradient(135deg, #F59E0B, #F97316)" } : undefined}
      >
        V2
      </button>
    </div>
  );
}
