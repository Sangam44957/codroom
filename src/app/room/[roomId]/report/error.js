"use client";

export default function ReportError({ error, reset }) {
  return (
    <div className="min-h-screen bg-[#04040f] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-white mb-2">Report Error</h1>
          <p className="text-gray-400 mb-6">
            {process.env.NODE_ENV === "development" 
              ? error?.message || "Failed to load interview report"
              : "Unable to load the interview report. Please try again."}
          </p>
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}