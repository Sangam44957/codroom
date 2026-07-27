# Landing Page Redesign Plan — v3 (CANONICAL)
**Status:** IN PROGRESS
**Replaces:** v2 (COSMOQ dark terminal)

---

## Core Aesthetic: Spatial UI / Apple visionOS
NOT dark terminal. NOT green. NOT black background.
Floating frosted glass panels in a real environment — panels feel like they exist in physical space.

## Background
Deep space gradient — indigo/slate/aurora, NOT pure black:
`background: radial-gradient(ellipse at 30% 20%, #1a1040 0%, #0d0d1a 40%, #0a0f1e 100%)`
Layered aurora blobs: purple, teal, rose — blurred 150px+ so they're ambient, not visible as shapes.
This gives glass panels something real to blur against.

## The Hero Window
- A floating visionOS-style panel showing codRoom interview UI
- `backdrop-filter: blur(40px)`, `background: rgba(255,255,255,0.08)`
- White hairline border: `rgba(255,255,255,0.15)`
- Top edge highlight: `linear-gradient(180deg, rgba(255,255,255,0.12), transparent)`
- Heavy drop shadow with color: `0 40px 120px rgba(0,0,0,0.6), 0 0 80px rgba(120,80,255,0.15)`
- Mouse parallax: gentle tilt on mouse move (max 8deg) using CSS transform
- Inside: split view — code editor left, AI report right — static, looks like a real screenshot

## Feature Panels
- 3 smaller floating glass cards below the hero window
- Each slightly different tint (purple, teal, rose) bleeding through the glass
- Hover: lifts 8px, glow intensifies
- visionOS-style: rounded-2xl, no sharp edges anywhere

## Typography
- Inter, NOT monospace for headlines
- Large weight (800), tight tracking
- White/cream: `#f0f0f5`
- Subtext: `rgba(255,255,255,0.5)`
- NO green accent — use white/purple/teal only

## Navbar
- Fully transparent, glass on scroll
- Logo: codRoom, Inter bold
- Links: clean, no monospace
- CTA: glass button with purple tint

## Files
- `src/app/page.js` — full rewrite
- `src/app/globals.css` — spatial tokens
- `src/components/ui/DiffScrollMockup.js` — DELETE / replace with InterviewWindow.js
- `src/components/ui/InterviewWindow.js` — NEW floating window component

## What we removed from v2
- All monospace typography for headlines
- Green diff accent
- Dark terminal aesthetic
- Scroll-driven diff animation (caused gaps + jank)
- Ambient green orbs
