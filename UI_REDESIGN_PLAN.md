# CodRoom UI Redesign Plan

## The Core Problem

The site looks AI-made because it follows the exact same template that every
AI-generated dark SaaS site uses in 2024. It's not one thing — it's the
combination of all these patterns together:

- Deep purple/violet + cyan gradient as the accent
- `from-violet-600 to-cyan-600` gradient buttons everywhere
- 3 animated floating orbs in the background
- `gradient-text` on the hero headline
- Glass cards with `rgba(255,255,255,0.05)` + `backdropFilter: blur(20px)`
- `whileHover={{ scale: 1.04, y: -2 }}` on every single button
- Spinning conic gradient border (`animated-border`)
- `gradient-text` on the dashboard welcome message

---

## Changes — In Order of Impact

### 1. Kill the violet→cyan gradient buttons (HIGHEST IMPACT)

Every button currently uses `from-violet-600 to-cyan-600`. This is the #1
AI-generated pattern right now.

**Replace with:** Solid `bg-indigo-600 hover:bg-indigo-500` — no gradient.

Files to change:
- `src/app/dashboard/page.js` — every "New Interview", "Create Pipeline",
  "Create Template", "Create Interview Room" button
- `src/app/page.js` — "Start for free", "Get started free" CTAs

---

### 2. Remove gradient-text from dashboard welcome (HIGHEST IMPACT)

`"Welcome back, <span className="gradient-text">{user?.name}!</span>"`

This animated shifting gradient on a person's name is the single most
AI-generated pattern on the site.

**Replace with:** Plain `text-white` — no gradient, no animation.

File: `src/app/dashboard/page.js` line ~170

---

### 3. Reduce background orbs from 3 to 1

Currently 3 animated orbs: orb-violet, orb-cyan, orb-rose — all floating
with keyframe animations.

**Replace with:** One static violet orb, top-left, no animation, opacity 0.10.

Files to change:
- `src/app/globals.css` — remove orb-cyan, orb-rose keyframes and classes
- `src/app/dashboard/page.js` — remove `<div className="orb orb-cyan" />`
- `src/app/page.js` — remove the 3 aurora blob divs, replace with 1

---

### 4. Remove 3D tilt from InterviewWindow

The `onMouseMove` 3D perspective tilt is a portfolio/demo trick. Looks
impressive for 2 seconds, then feels gimmicky for a professional product.

**Replace with:** Static window, keep the drop shadow and glass effect.

File: `src/components/ui/InterviewWindow.js`
- Remove `tilt` state
- Remove `onMouseMove` / `onMouseLeave` handlers
- Remove `frameRef`
- Remove `perspective(1200px) rotateX rotateY` transform style

---

### 5. Swap Inter → DM Sans for body font

Inter is on every dark SaaS site. DM Sans has slightly more personality,
same readability, pairs well with Syne (which you already use for display).

**Syne (display/headings) — KEEP**
**JetBrains Mono (code) — KEEP**
**Inter (body) — REPLACE with DM Sans**

File: `src/app/layout.js`
```js
// Remove:
import { Inter, Syne, JetBrains_Mono } from "next/font/google"
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

// Add:
import { DM_Sans, Syne, JetBrains_Mono } from "next/font/google"
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-inter" })
```

Note: keep the variable name `--font-inter` so nothing else breaks.

---

### 6. Reduce feature card accent colors from 5 to 2

Currently the FEATURES array in `src/app/page.js` uses 5 different accent
colors: `#a78bfa`, `#38bdf8`, `#f472b6`, `#34d399`, `#fb923c`.

5 accent colors = no accent color. It just looks random.

**Replace with:** 2 colors only:
- Primary accent: `#6366f1` (indigo)
- Secondary accent: `#10b981` (emerald — for success/positive metrics only)

Updated FEATURES array:
```js
const FEATURES = [
  { title: "Real-time collaboration", accent: "#6366f1", ... },
  { title: "AI evaluation",           accent: "#6366f1", ... },
  { title: "Code execution",          accent: "#10b981", ... },
  { title: "Interview playback",      accent: "#10b981", ... },
  { title: "WebRTC video",            accent: "#6366f1", ... },
];
```

Same fix for the "How it works" steps — currently uses 4 different colors.

---

### 7. Hero headline gradient — simplify to 2 colors max

Currently: `linear-gradient(135deg, #a78bfa 0%, #38bdf8 50%, #f472b6 100%)`
Three colors in one gradient text = too much.

**Replace with:** `linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)`
Two colors, same family, subtle.

File: `src/app/page.js` — hero h1 span

---

## Font Stack (Final)

| Role     | Font           | Variable        |
|----------|----------------|-----------------|
| Display  | Syne 700/800   | `--font-display`|
| Body     | DM Sans        | `--font-inter`  |
| Mono     | JetBrains Mono | `--font-mono`   |

---

## Color Palette (Final)

| Role             | Value       | Usage                          |
|------------------|-------------|--------------------------------|
| Background       | `#04040f`   | Page base                      |
| Surface          | `#0d0d18`   | Cards, panels                  |
| Border           | `rgba(255,255,255,0.06)` | All borders        |
| Text primary     | `#f1f5f9`   | Headings, important text       |
| Text muted       | `#64748b`   | Descriptions, labels           |
| Accent primary   | `#6366f1`   | Buttons, active states, links  |
| Accent success   | `#10b981`   | Success states, positive data  |
| Accent error     | `#ef4444`   | Errors only                    |
| Accent warning   | `#f59e0b`   | Warnings only                  |

**Removed:** cyan (`#38bdf8`), pink (`#f472b6`), orange (`#fb923c`) as accents.
These only appear in status/data contexts, never as UI chrome.

---

## What NOT to Change

- The glassmorphism itself is fine — the values are good
- The Syne display font — it's a good choice, keep it
- JetBrains Mono — correct choice for a dev tool
- The overall dark theme and background color `#04040f`
- The scroll-triggered fade-up animations — subtle and purposeful
- The glass card structure in InterviewWindow — just remove the tilt
- The navbar blur-on-scroll behavior — this is good UX

---

## Files to Touch

1. `src/app/layout.js` — font swap (Inter → DM Sans)
2. `src/app/page.js` — gradient buttons, orbs, headline gradient, card accents
3. `src/app/dashboard/page.js` — gradient buttons, gradient-text on name, orbs
4. `src/app/globals.css` — remove orb-cyan/orb-rose, remove animated-border
5. `src/components/ui/InterviewWindow.js` — remove 3D tilt
