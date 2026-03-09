"use client";

export default function OutputPanel({ output, isRunning }) {
  if (isRunning) {
    return (
      <div className="h-full bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-300">Output</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-xs text-yellow-400">Running...</span>
          </div>
        </div>
        <div className="flex items-center justify-center h-20">
          <svg
            className="animate-spin h-6 w-6 text-blue-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="h-full bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-300">Output</span>
        </div>
        <p className="text-gray-500 text-sm">
          Click &quot;Run Code&quot; to see output here
        </p>
      </div>
    );
  }

  const isError = output.status === "error";

  return (
    <div className="h-full bg-gray-900 border-t border-gray-800 p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Output</span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              isError
                ? "bg-red-900/30 text-red-400 border border-red-800"
                : "bg-green-900/30 text-green-400 border border-green-800"
            }`}
          >
            {output.type}
          </span>
        </div>

        {/* Execution Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {output.time && <span>⏱ {output.time}s</span>}
          {output.memory && <span>💾 {(output.memory / 1024).toFixed(1)}MB</span>}
        </div>
      </div>

      {/* Output Content */}
      <pre
        className={`font-mono text-sm whitespace-pre-wrap p-3 rounded-lg ${
          isError
            ? "bg-red-950/30 text-red-300 border border-red-900"
            : "bg-gray-800 text-green-300 border border-gray-700"
        }`}
      >
        {output.output}
      </pre>
    </div>
  );
}