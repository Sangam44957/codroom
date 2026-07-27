# CodRoom — UI Redesign Plan (Remaining Pages)
**Status:** PLANNED
**Aesthetic:** Spatial / liquid glass — same system as login/register

---

## Design System (Canonical)

### Background
All authenticated pages use the same dark spatial background:
```
background: #04040f (base)
ambient-orbs: orb-violet + orb-cyan (existing CSS classes — keep as-is)
dot-grid: fixed inset-0 opacity-30 (keep as-is)
```
Auth pages (forgot-password, reset-password, verify-email) use the aurora SpatialBg from login/register.

### Glass Card Token
```js
{
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(32px)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
  borderRadius: "1.5rem" // rounded-3xl
}
```

### ShimmerBorder
Used on auth pages (login/register). NOT used on dashboard/inner pages — too heavy for data-dense UIs. Inner pages use the glass card token directly.

### Buttons
- Primary: `linear-gradient(135deg, rgba(167,139,250,0.3), rgba(56,189,248,0.2))` + `border: 1px solid rgba(167,139,250,0.4)` + `color: #e9d5ff`
- Danger: `bg-rose-500/10 border-rose-500/20 text-rose-400`
- Ghost: `border border-white/[0.08] text-slate-400 hover:text-white`

### Input fields
No icons inside inputs. Clean fields with `bg: rgba(255,255,255,0.04)`, `border: rgba(255,255,255,0.08)`, focus glow `rgba(167,139,250,0.5)`.

### Labels
`text-xs font-semibold uppercase tracking-widest` + `color: rgba(255,255,255,0.4)`

---

## Pages to Redesign

### 1. `src/app/(auth)/forgot-password/page.js`
**Current:** Old logo with gradient "C" icon, flat dark card, Mail icon in input.
**Changes:**
- Replace bg with `SpatialBg` (same aurora as login/register)
- Replace logo with `cod<span>Room</span>` text logo (same as login)
- Wrap card in `ShimmerBorder` (same liquid glass as login)
- Remove `Mail` icon from input — clean field only
- Keep all API logic untouched

---

### 2. `src/app/(auth)/reset-password/page.js`
**Current:** Old logo, flat dark card, Lock icons in both password inputs, emoji icons (🔐, ✅).
**Changes:**
- Replace bg with `SpatialBg`
- Replace logo with text logo
- Wrap card in `ShimmerBorder`
- Remove `Lock` icons from inputs — clean fields only
- Add eye toggle to both password fields (show/hide)
- Remove emoji icons (🔐, ✅) — replace success state with clean text + checkmark icon from lucide
- Keep OtpInput component untouched
- Keep all API/countdown/resend logic untouched

---

### 3. `src/app/(auth)/verify-email/page.js`
**Current:** Old logo, flat dark card, emoji icon (📧).
**Changes:**
- Replace bg with `SpatialBg`
- Replace logo with text logo
- Wrap card in `ShimmerBorder`
- Remove emoji (📧) — replace with a clean mail icon or just the heading
- Keep OtpInput component untouched
- Keep all API/countdown/resend logic untouched

---

### 4. `src/app/dashboard/page.js`
**Current:** `bg-[#04040f]` + ambient-orbs + dot-grid. Stat cards use Tailwind gradient classes. Tabs are basic buttons. Room/template/pipeline cards are flat `bg-white/[0.02]`.
**Changes:**
- Stat cards: upgrade to glass token (backdrop-blur, inset highlight, heavier shadow). Keep color accents (blue/emerald/amber/violet).
- Tab bar: glass token background, active tab gets shimmer-style border highlight
- Room/template/pipeline cards: glass token, hover lifts with glow (`box-shadow: 0 8px 32px rgba(167,139,250,0.1)`)
- "New Interview" button: upgrade to glass primary button style
- Empty state icons: remove emoji (🎙️, 📋, 🎯) — replace with lucide icons in glass icon containers
- Navbar: already handled — no change
- All data fetching, socket logic, pagination untouched

---

### 5. `src/app/analytics/page.js`
**Current:** `bg-[#04040f]` + ambient-orbs. StatCards use `glass-panel` CSS class. Charts in flat `bg-white/[0.025]` containers.
**Changes:**
- StatCards: already use `glass-panel` — upgrade to inline glass token for consistency (remove CSS class dependency)
- Chart containers: glass token (backdrop-blur, inset highlight)
- Period selector: glass token background, active period gets purple tint border
- Recent interviews table: glass token container, row hover `bg-white/[0.03]`
- All data fetching, chart logic untouched

---

### 6. `src/app/problems/page.js`
**Current:** `bg-[#04040f]` + ambient-orbs. Problem list items are flat. Detail panel is `bg-[#0a0818]`. CreateProblemModal is `bg-[#0a0818]`.
**Changes:**
- Problem list items: glass token on hover/selected state
- Detail panel (sticky right): glass token with backdrop-blur
- CreateProblemModal: glass token card, input fields upgraded to match design system (no icons, clean fields, focus glow)
- Filter inputs/selects: glass token style
- Empty state: remove emoji (🔍) — lucide Search icon in glass container
- All filter/search/pagination/delete logic untouched

---

### 7. `src/app/pipelines/[pipelineId]/page.js`
**Current:** Plain `bg-[#04040f]`, no ambient orbs. Recommendation distribution uses light-mode colors (`bg-green-100 text-green-800` etc). Table is flat.
**Changes:**
- Add ambient-orbs + dot-grid
- Recommendation distribution cards: dark glass token with color tints (emerald/cyan/amber/rose) instead of light-mode colors
- Table container: glass token
- Table header `SortTh`: dark style (`text-slate-400` not `text-gray-600`)
- `ScoreBadge`: dark glass style instead of light-mode colored spans
- LoadingSkeleton: add ambient-orbs
- All sort/data logic untouched

---

### 8. `src/app/room/[roomId]/report/page.js`
**Current:** `bg-[#04040f]` + ambient-orbs. Already well-styled. Minor polish needed.
**Changes:**
- Score/metric panels: glass token (backdrop-blur upgrade from flat `bg-white/[0.025]`)
- Share modal: glass token card
- Rubric sliders: style the range input track/thumb with purple accent
- No structural or logic changes

---

### 9. `src/app/share/[token]/page.js`
**Current:** `bg-[#04040f]` + ambient-orbs. Already well-styled. Minor polish needed.
**Changes:**
- Same glass token upgrade on all panels (same as report page)
- No structural or logic changes

---

## Execution Order

1. Auth pages (forgot-password → reset-password → verify-email) — small, isolated
2. Dashboard — highest traffic, most visible
3. Analytics + Problems — data pages
4. Pipeline compare — currently has light-mode color regression
5. Report + Share — already close, just polish

---

## What Does NOT Change

- All API routes (`src/app/api/`)
- All server files (`server/`)
- All components in `src/components/` (Navbar, RoomCard, modals, etc.) — unless a specific component needs a targeted style fix
- All hooks, services, repositories, lib files
- `src/app/room/[roomId]/page.js` (live interview room) — complex, off-limits
- `src/app/room/[roomId]/playback/page.js` — off-limits
- OtpInput component — untouched
- All business logic, validation, API calls in every page

---

## Notes

- `ShimmerBorder` (rotating conic-gradient via `useAnimationFrame`) is only for auth pages. Too heavy for data-dense pages.
- Dashboard/inner pages use the glass card token directly (static, no animation).
- Emoji removal: replace all emoji icons in empty states and headers with lucide icons in `w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20` containers.
- Light-mode color classes (`bg-green-100 text-green-800`, `bg-red-50 text-red-700`, etc.) must be replaced with dark equivalents everywhere.
