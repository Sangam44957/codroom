"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const TOUR_STEPS = [
  {
    title: "Welcome to CodRoom 👋",
    description:
      "This quick tour will show you the key areas of the interview room. You can skip at any time.",
    target: null,
    side: "center",
  },
  {
    title: "Problem Panel",
    description:
      "The problem statement lives here. Read the requirements carefully before coding. You can resize this panel by dragging the divider.",
    target: "[data-tour='problem-panel']",
    side: "right",
  },
  {
    title: "Code Editor",
    description:
      "Write your solution here. Use Ctrl+Enter to run your code. You can switch languages from the dropdown in the top-right of the editor.",
    target: "[data-tour='editor-panel']",
    side: "right",
  },
  {
    title: "Snippet Library",
    description:
      "Press Ctrl+Shift+S inside the editor to open the snippet library — quickly insert common data structures and algorithm templates.",
    target: "[data-tour='editor-panel']",
    side: "right",
  },
  {
    title: "Output Panel",
    description:
      "Your code's output and test results appear here after you run your code.",
    target: "[data-tour='output-panel']",
    side: "top",
  },
  {
    title: "Chat & Video",
    description:
      "Use the right panel to chat with your interviewer, see their video feed, or collaborate on the whiteboard.",
    target: "[data-tour='right-panel']",
    side: "left",
  },
  {
    title: "Keyboard Shortcuts",
    description:
      "Press Ctrl+/ anytime to see all keyboard shortcuts. You're all set — good luck! 🚀",
    target: null,
    side: "center",
  },
];

const CARD_W = 320;
const CARD_H = 180; // approximate, used for initial placement
const GAP = 12;
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
  const [cardStyle, setCardStyle] = useState({ top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
  const [highlight, setHighlight] = useState(null); // { top, left, width, height }
  const cardRef = useRef(null);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  useEffect(() => {
    if (!current.target) {
      setHighlight(null);
      setCardStyle({ top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
      return;
    }

    const el = document.querySelector(current.target);
    if (!el) {
      setHighlight(null);
      setCardStyle({ top: "50%", left: "50%", transform: "translate(-50%,-50%)" });
      return;
    }

    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    setHighlight({ top: r.top, left: r.left, width: r.width, height: r.height });

    // Place card adjacent to the target based on preferred side
    let top, left, transform = "";
    const cardH = cardRef.current?.offsetHeight || CARD_H;

    if (current.side === "right") {
      left = Math.min(r.right + GAP, vw - CARD_W - 8);
      top = r.top + r.height / 2 - cardH / 2;
    } else if (current.side === "left") {
      left = Math.max(r.left - CARD_W - GAP, 8);
      top = r.top + r.height / 2 - cardH / 2;
    } else if (current.side === "top") {
      top = Math.max(r.top - cardH - GAP, 8);
      left = r.left + r.width / 2 - CARD_W / 2;
    } else {
      // bottom
      top = Math.min(r.bottom + GAP, vh - cardH - 8);
      left = r.left + r.width / 2 - CARD_W / 2;
    }

    // Clamp within viewport
    top = Math.max(8, Math.min(top, vh - cardH - 8));
    left = Math.max(8, Math.min(left, vw - CARD_W - 8));

    setCardStyle({ top, left, transform });
  }, [step, current.target, current.side]);

  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" />

      {/* Spotlight cutout over target */}
      {highlight && (
        <div
          className="absolute rounded-lg ring-2 ring-violet-400/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] pointer-events-none"
          style={{
            top: highlight.top - 4,
            left: highlight.left - 4,
            width: highlight.width + 8,
            height: highlight.height + 8,
            transition: "all 0.25s ease",
          }}
        />
      )}

      {/* Tour card */}
      <div
        ref={cardRef}
        className="pointer-events-auto absolute"
        style={{ ...cardStyle, width: CARD_W, transition: "top 0.25s ease, left 0.25s ease" }}
      >
        <div
          className="bg-[#111118] border border-violet-500/30 rounded-2xl shadow-2xl shadow-black/60 p-5 relative"
          style={{ backdropFilter: "blur(24px)" }}
        >
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
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? "bg-violet-400 w-3" : "bg-white/20 w-1.5"
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
