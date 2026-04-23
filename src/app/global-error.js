"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-[#0a0818] text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-slate-400 text-sm">The error has been reported. Try again.</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
