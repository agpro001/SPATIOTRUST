
## Goal

Make the site smooth on low-end devices without removing any animation, then ship four concrete feature upgrades.

---

## 1. Performance pass (keep all animations, just make them cheap)

Root causes of the current lag (from the codebase):
- Multiple `<Canvas>` instances mounted at once (Hero3D, AICopilot orb, ContactSection torus, PointCloudScene) all rendering every frame at full devicePixelRatio.
- Framer-motion `whileInView` cascades + parallax scroll listeners firing on every scroll event.
- Re-renders of `AICopilot` chat panel on every streamed token causing the full markdown tree to re-render.

Fixes (no animation removed, just cheaper):

- **Three.js fiber tuning** on every `<Canvas>`:
  - `dpr={[1, 1.5]}` (cap pixel ratio)
  - `frameloop="demand"` for the AICopilot orb and ContactSection torus, with a manual `invalidate()` tick on tone/hover changes; `frameloop="always"` kept only for Hero3D.
  - `gl={{ antialias: false, powerPreference: "high-performance" }}` and `<PerformanceMonitor>` from `@react-three/drei` to auto-drop dpr on weak GPUs.
  - Pause off-screen canvases via `IntersectionObserver` (set `frameloop="never"` when not visible).
- **Detect low-power device** once in `src/lib/perf.ts` (`navigator.hardwareConcurrency <= 4 || matchMedia('(prefers-reduced-motion: reduce)').matches || /Android.*Mobile/.test(ua)`). Export `isLowPower` + `tier: 'low' | 'mid' | 'high'`.
  - Low tier: drop point-cloud sample cap from 6000 → 2500 in `parseGlb.ts`; reduce `icosahedronGeometry` detail from 1 → 0; disable torus knot rotation speed by half; clamp framer-motion spring `stiffness` lower.
- **Scroll/parallax**: replace per-`scroll` listeners with `useScroll` + `useTransform` (passive, already rAF-batched) where not already used; wrap parallax sections in `will-change: transform` and `content-visibility: auto` so off-screen sections skip paint.
- **AICopilot streaming**: memoize each message with `React.memo` keyed by index; only the last message re-renders during streaming. Wrap markdown in a `useMemo` keyed on content.
- **Bundle/runtime**: lazy-load `Hero3D`, `ContactSection`, `PointCloudScene`, and `AICopilot` Canvas via `React.lazy` + `Suspense` with a CSS-only placeholder that preserves layout (no CLS).
- **CSS**: add `transform: translateZ(0)` and `backface-visibility: hidden` to the heavy animated wrappers; switch box-shadow-heavy hover transitions to `filter: drop-shadow` where possible.

Acceptance: First contentful paint unchanged or better; scrolling the landing page stays >50 fps on a 4-core throttled CPU profile; no animation visually removed.

---

## 2. Backend `validator.py` — accept threshold params

Update `backend/validator.py`:
- Change `validate_point_cloud(points, opts=None)`:
  - `base_support_tolerance` (default 0.05) replaces the hard-coded `0.05 * (x_max - x_min)` slack multiplier.
  - `confidence_sensitivity` (default 0.6) reweights the final score: `confidence = lerp(0.45,0.65, s)*support + lerp(0.40,0.25, s)*float + lerp(0.15,0.10, s)*mass` and the pass cutoff becomes `0.5 + 0.3 * s`.
- Update `backend/app.py` (Flask handler) to read `opts` from JSON body and forward.
- Keep stdout CLI shim working (`opts` optional).

The TS validator + `/api/validate-spatial-data` already pass `opts` — this brings parity.

---

## 3. AI Copilot — anomaly-explainer + suggest-fix chips

In `src/components/AICopilot.tsx`:
- Add two new quick-prompt chips next to the existing ones, only visible when `result` exists:
  - **"Explain anomaly"** → sends a structured prompt: "Given the validation context, identify which heuristic (base support, centroid alignment, floating mass) triggered and explain in 3 bullets why."
  - **"Suggest a fix"** → "Recommend 3 concrete spatial corrections (recenter mass, add base footprint, remove floating slice) that would flip this from fail to pass. Reference metrics from the context."
- Both call the existing `send()` with a server-side flag `mode: 'explainer' | 'fix'` so `/api/ai-chat` can append a stricter system suffix (bulleted output, max 120 words).
- Chips animate in with `AnimatePresence` + `whileTap scale 0.9`, color-coded (amber for explain, emerald for fix).
- Result tone (`ok`/`fail`) drives chip visibility — "Suggest a fix" only shows on fail.

---

## 4. Oracle Logs — filter pills + CSV export

In `src/routes/oracle-logs.tsx`:

**Filter pills row** above the table:
- Status: All / Pass / Fail
- Anomaly: All / Detected / Clean
- Scenario: dynamically built from `[...new Set(logs.map(l => l.scenario))]`
- Pills are framer-motion buttons with `layoutId` underline that slides between active selections.
- Filtering is `useMemo` over `logs`; empty state message updates when filters yield 0 rows.

**CSV export button** (top-right):
- Builds CSV from the currently filtered list with columns: `timestamp, scenario, status, confidence, anomaly_detected, zk_mock_hash, tx_hash`.
- Escapes quotes/newlines; uses `Blob` + `URL.createObjectURL` + hidden `<a download>` — no new deps.
- Filename: `spatiotrust-logs-{yyyymmdd-hhmm}.csv`.
- Button has a subtle press animation and a toast confirmation via existing `sonner`.

---

## Technical notes

- No new npm dependencies.
- `frameloop="demand"` requires `useThree().invalidate()` calls on state change — wired inside each `Core`/torus component.
- `PerformanceMonitor` is already part of `@react-three/drei` (installed).
- `perf.ts` runs only client-side (guarded by `typeof window !== 'undefined'`) so SSR is unaffected.
- Backend change is backward-compatible (opts optional).

## Files touched

- `src/lib/perf.ts` (new)
- `src/components/landing/Hero3D.tsx`, `src/components/AICopilot.tsx`, `src/components/ContactSection.tsx`, `src/components/PointCloudScene.tsx` (Canvas tuning, memoization, chips)
- `src/routes/index.tsx`, `src/routes/app.tsx` (lazy-load heavy sections)
- `src/routes/oracle-logs.tsx` (filters + CSV)
- `src/routes/api/ai-chat.ts` (mode-aware system suffix)
- `src/styles.css` (will-change / content-visibility utilities)
- `backend/validator.py`, `backend/app.py` (threshold params)
