"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F5F0" }}>
      <div className="text-center max-w-md mx-auto px-6">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
        >
          <span className="text-2xl text-white">!</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
        <p className="text-gray-500 mb-2">
          The dashboard encountered an error loading data.
        </p>
        <p className="text-sm text-gray-400 mb-6 font-mono">
          {error.message || "Unknown error"}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)" }}
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-6 py-3 rounded-xl font-semibold text-gray-600 border border-gray-200 hover:bg-white"
          >
            Reload Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
