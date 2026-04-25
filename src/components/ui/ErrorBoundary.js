"use client";

import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[200px] bg-[#0d0d14] rounded-xl border border-white/[0.06] p-8">
          <div className="text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-white font-semibold mb-1">Something went wrong</h3>
            <p className="text-slate-500 text-sm mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}