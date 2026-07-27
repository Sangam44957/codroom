"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const TOUR_STEPS = [
  {
    title: "Welcome to CodRoom 👋",
    description:
      "This quick tour will show you the key areas of the interview room. You can skip at any time.",
    target: null,
    position: "center",
  },
  {
    title: "Problem Panel",
    description:
      "The problem statement lives here. Read the requirements carefully before coding. You can resize this panel by dragging the divider.",
    target: "problem-panel",
    position: "right",
  },
  {
    title: "Code Editor",
    description:
      "Write your solution here. Use Ctrl+Enter to run your code. You can switch languages from the dropdown in the top-right of the editor.",
    target: "editor-panel",
    position: "right",
  },
  {
    title: "Snippet Library",
    description:
      "Press Ctrl+Shift+S inside the editor to open the snippet library — quickly insert common data structures and algorithm templates.",
    target: "editor-panel",
    position: "right",
  },
  {
    title: "Output Panel",
    description:
      "Your code's output and test results appear here after you run your code.",
    target: "output-panel",
    position: "top",
  },
  {
    title: "Chat & Video",
    description:
      "Use the right panel to chat with your interviewer, see their video feed, or collaborate on the whiteboard.",
    target: "right-panel",
    position: "left",
  },
  {
    title: "Keyboard Shortcuts",
    description:
      "Press Ctrl+/ anytime to see all keyboard shortcuts. You're all set — good luck! 🚀",
    target: null,
    position: "center",
  },
];

const STORAGE_KEY = "codroom_tour_completed";

export function useOnboardingTour(role) {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (role !== "candidate") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setShowTour(true);
  }, [role]);

  function completeTour() {
    localStorage.setItem(STORAGE_KEY, "1");
    setShowTour(false);
  }

  return { showTour, completeTour };
}

export default function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      {/* Backdrop — only for center steps */}
      {current.position === "center" && (
        <div className="absolute inset-0 bg-black/60 pointer-events-auto" />
      )}

      {/* Tour card */}
      <div
        className={`pointer-events-auto absolute ${positionClass(current.position)} max-w-sm w-full`}
      >
        <div
          className="bg-[#111118] border border-violet-500/30 rounded-2xl shadow-2xl shadow-black/60 p-5"
          style={{ backdropFilter: "blur(24px)" }}
        >
          {/* Top gradient line */}
          <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-white font-bold text-sm">{current.title}</h3>
            <button
              onClick={onComplete}
              className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
              aria-label="Skip tour"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed mb-4">
            {current.description}
          </p>

          <div className="flex items-center justify-between">
            {/* Step dots */}
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === step ? "bg-violet-400 w-3" : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
                >
                  <ChevronLeft size={12} /> Back
                </button>
              )}
              <button
                onClick={() => (isLast ? onComplete() : setStep((s) => s + 1))}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-semibold transition-all"
              >
                {isLast ? "Done" : "Next"}
                {!isLast && <ChevronRight size={12} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function positionClass(position) {
  switch (position) {
    case "center":
      return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4";
    case "right":
      return "top-1/2 -translate-y-1/2 left-[38%] px-4";
    case "left":
      return "top-1/2 -translate-y-1/2 right-[20%] px-4";
    case "top":
      return "bottom-[14rem] left-1/2 -translate-x-1/2 px-4";
    default:
      return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4";
  }
}
