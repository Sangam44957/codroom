"use client";

import { Component } from "react";

export default class ErrorBoundary extends Component {
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, { componentStack }) {
    console.error("[ErrorBoundary]", error, componentStack);
  }

  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#04040f] flex items-center justify-center p-6">
          <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-10 max-w-md w-full text-center">
            <div className="text-5xl mb-4">💥</div>
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-500 text-sm mb-6 break-words">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold text-sm transition-all"
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
