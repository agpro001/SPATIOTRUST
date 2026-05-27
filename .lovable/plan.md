# SpatioTrust — Upgrade Plan

## 1. API key diagnosis

The Gemini key is set (`GEMINI_API_KEY` present) but `/api/ai-chat` returns **HTTP 429** — the key is valid, it's just rate-limited / out of free-tier quota. Fix:

- Keep your Gemini key as the **primary** provider.
- On any `429 / 402 / 503` from Gemini, **automatically fall back** to **Lovable AI Gateway** (`google/gemini-3-flash-preview`) using `LOVABLE_API_KEY`. Same fallback in `/api/ai-chat` and `/api/ai-vision`.
- Surface which provider answered in the response header `x-oracle-provider` so the UI can show a tiny "fallback" badge.

## 2. Strip every "Lovable" mention from user-visible code

- Rename the AI gateway helper to `AI Mesh` in all UI strings, comments, READMEs, terminal output, sidebar, and copilot tooltips.
- Replace "powered by Lovable AI" / "Lovable Cloud" copy with "Powered by SpatioTrust AI Mesh".
- `LOVABLE_API_KEY` stays as the env var (platform-managed), but never referenced in UI text.
- Server route comments, `backend/README.md`, and `.lovable/plan.md` get the same scrub (file kept, content rewritten as `spec.md`).

## 3. Animated brand logo

New `src/components/BrandLogo.tsx`:

- SVG hex-shield with an orbiting node-ring and a pulsing core dot.
- Two modes: `compact` (header) and `hero` (landing hero, animated draw-in + continuous slow rotation).
- Replaces the current `Shield` lucide icon in `LandingHeader`, `Sidebar`, footer, and favicon.

## 4. AI Copilot orb on the landing page

Currently `AICopilot` only mounts inside `/app`. Promote it so it appears on **both** `/` and `/app` with identical 3D icosahedron animation, streaming chat, and quick-prompts. Mount it in `__root.tsx` so it's global.

## 5. Contact section (bottom of `/` and `/app`)

New `src/components/ContactSection.tsx`:

- 3D rotating torus-knot background (react-three-fiber, bloom).
- Three animated cards with brand SVG icons (Email, Instagram, X) — hover tilts in 3D, icons morph/fill, framer-motion `whileInView` cascade.
- Links: `mailto:adityagupta1234.in@gmail.com`, `https://instagram.com/agpro001`, `https://x.com/agpro001`.
- Mounted at end of landing page and at the bottom of `/app` dashboard.
- Also add Made by Aditya with a smooth 3d motion graphics kinetic text animation.
- Add motion graphics kinetic energy 3d animation for all highlights texts.

## 6. Real-time ingestion progress

Extend `useApp` store with `ingestPhase: 'idle' | 'reading' | 'decoding' | 'parsing' | 'vision' | 'rendering' | 'validating' | 'done'` and `ingestPct: number`. `DropZone` shows:

- Animated radial progress ring (SVG `strokeDasharray`).
- Stage label that morphs with `AnimatePresence`.
- Per-format hooks emit progress (PLY/OBJ line-by-line, GLB byte-stream, Vision = indeterminate shimmer).

## 7. Native GLB / GLTF parser

New `src/lib/ingestion/parseGlb.ts` using `three/examples/jsm/loaders/GLTFLoader.js` — traverse meshes, sample vertex positions (cap 6000), recenter on origin, push into `Point[]`. Wire into ingestion router (already handles `.ply`, `.obj`). No new npm dep — `three` is already installed.

## 8. Configurable validation thresholds

Add to `useApp` store: `baseSupportTolerance` (0–0.5, default 0.15), `confidenceSensitivity` (0–1, default 0.6). Persist in localStorage. Settings page gains two animated `<Slider>` controls with live preview chips. `src/lib/validator.ts` and `backend/validator.py` read these values (frontend validator reads from store, backend accepts them in POST body).

## 9. Oracle Logs upgrade

Existing `/oracle-logs` route gains:

- Persistent log store (localStorage, capped 200 entries) appended on every validation.
- Columns: timestamp · scenario · confidence · status · `zk_mock_hash` (click-to-copy) · tx hash if published.
- CSV export button, filter pills, framer-motion row enter animation.

## 10. Publish Proof — real Sepolia send

Current button is wired to `eth_sendTransaction`. Polish:

- Detect chainId, prompt to switch to Sepolia (0xaa36a7) if wrong.
- Embed `zk_mock_hash` as transaction `data` (hex-encoded UTF-8).
- On success, write tx hash back into the Oracle Logs entry and show an etherscan link toast.
- WalletConnect path uses the same flow.

## 11. Additional AI features (real, not mocked)

All routed through the same Gemini → Lovable AI fallback chain:

- **Anomaly Explainer** — button on a failed validation result that asks the model to point to the exact heuristic that fired, using the JSON context.
- **Structure Q&A** — ask free-form questions about the loaded point cloud (centroid, bbox, support ratio injected into prompt).
- **Suggest Fix** — for failed scenes, model proposes structural corrections (e.g. "add support pillar at x=2.1, z=-0.7").
- **Voice narration toggle** — uses browser `SpeechSynthesis` to read the auto-narrate summary.
- All three live as chips inside the existing copilot panel so no new floating UI.

## 12. Error sweep

- Suppress `THREE.Clock deprecated` warning by passing `frameloop="demand"` where safe, otherwise leave (it's harmless).
- Confirm `__root.tsx` still renders `<Outlet />` after copilot mount.
- Add `errorComponent` + `notFoundComponent` to `/`, `/app`, `/oracle-logs`, `/settings` (currently missing on some).
- Validate all `<Link to="...">` targets after route changes.

## Technical layout

```text
src/
  components/
    BrandLogo.tsx              [new] animated SVG logo
    ContactSection.tsx         [new] 3D contact block
    IngestProgress.tsx         [new] radial progress ring
    AICopilot.tsx              [edit] add AI feature chips, rename gateway
    landing/LandingHeader.tsx  [edit] swap Shield → BrandLogo
    Sidebar.tsx                [edit] swap Shield → BrandLogo, rename
  lib/
    ingestion/
      parseGlb.ts              [new] GLTFLoader → Point[]
      index.ts                 [edit] route .glb/.gltf
    store.ts                   [edit] ingestPhase, thresholds, logs
    validator.ts               [edit] threshold params
    aiFallback.ts              [new] shared Gemini→Lovable wrapper
  routes/
    __root.tsx                 [edit] mount AICopilot globally
    index.tsx                  [edit] BrandLogo hero, ContactSection
    app.tsx                    [edit] ContactSection at bottom
    oracle-logs.tsx            [edit] real persisted logs + CSV
    settings.tsx               [edit] threshold sliders
    api/
      ai-chat.ts               [edit] Gemini→Lovable fallback
      ai-vision.ts             [edit] Gemini→Lovable fallback
backend/
  validator.py                 [edit] accept threshold params
  README.md                    [edit] rebrand
```

No new npm dependencies — `three`, `@react-three/fiber`, `@react-three/drei`, `framer-motion`, `ethers` are already installed.

## Out of scope

- Publishing real ZK proofs (still a sha-256 commitment, as per original spec).
- Actual on-chain contract — we send a plain Sepolia tx with `zk_mock_hash` in `data` (already the design).
- Removing the env var name `LOVABLE_API_KEY` itself — that's a platform-managed key and renaming it would break the gateway.

&nbsp;

All must work properly correctly and Really.