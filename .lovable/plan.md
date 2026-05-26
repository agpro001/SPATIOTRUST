# SpatioTrust — Homepage, Gemini AI, Universal Ingestion

## 1. Routing changes

```text
/                → NEW cinematic landing page (no auth, just "Enter Oracle" CTA → /app)
/app             → current dashboard (moved from /)
/oracle-logs     → unchanged
/settings        → unchanged (Gemini key status, WC projectId)
```

`src/routes/index.tsx` becomes the landing page. The current dashboard content moves to `src/routes/app.tsx`. The sidebar's "Mission Control" link updates to `/app`. The landing has its own minimal header (logo + single "Launch Oracle" button) — no sidebar.

## 2. Landing page (`/`)

Sections, all animated:

1. **Hero** — full-viewport. Animated 3D scene behind the headline: a slowly rotating wireframe building made of glowing points (react-three-fiber), with mouse-driven parallax (camera tilts to cursor). Headline "Verify Reality Before You Release Capital." Subhead, two CTAs: **Launch Oracle** (→ `/app`) and **How it works** (scrolls down).
2. **What it is** — 3-column glass cards (Spatial Ingest / Consensus Validation / ZK Attestation), each card scales+fades in on scroll (framer-motion `whileInView`).
3. **How it works** — horizontal pipeline diagram with 4 nodes (Ingest → Validate → Attest → Publish). A scroll-driven progress line fills between nodes as the user scrolls (parallax via `useScroll` + `useTransform`).
4. **Live demo strip** — embedded mini point-cloud viewer that auto-plays the valid vs fraud scenario in a loop, with captioned narration.
5. **Use cases** — bento grid (DeFi construction loans, insurance claims, supply chain, carbon credits). Tilt-on-hover cards.
6. **Tech stack & architecture** — diagram + bullets (TanStack Start, Cloudflare Workers, three.js, Gemini, ethers, WalletConnect).
7. **FAQ** — accordion.
8. **Final CTA** — repeat "Launch Oracle" button with pulsing glow.

Animation toolkit: framer-motion (`motion`, `useScroll`, `useTransform`, `whileInView`, `layoutId`), react-three-fiber for the hero scene, CSS-driven parallax for section backgrounds, button press = scale-tap + ripple, page transitions via `AnimatePresence`.

SEO: route-specific `head()` with title, description, og:image. Single H1 on landing.

## 3. Gemini integration (replaces Lovable AI Gateway)

- User must **revoke the leaked key** and generate a new one. I'll then store it as a server secret `GEMINI_API_KEY`.
- Rewrite `src/routes/api/ai-chat.ts` to call `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse` with the key in `x-goog-api-key` header. Convert OpenAI-style `{role,content}` history to Gemini's `contents:[{role,parts:[{text}]}]` shape, map `assistant`→`model`. Stream SSE chunks back to the browser unchanged (frontend parses `candidates[0].content.parts[0].text`).
- The existing `AICopilot.tsx` SSE reader is adjusted for the Gemini chunk shape.
- A new `src/routes/api/ai-vision.ts` endpoint accepts a base64 image/PDF page + prompt, calls Gemini 2.0 Flash with `inline_data`, and returns a synthesized `Point[]` + textual structural summary (used by the universal uploader, see §4).

## 4. Universal file ingestion

Replace the JSON-only `DropZone` with a multi-format ingestion pipeline. Detection by extension + MIME sniff:


| Input                  | Strategy                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.json`                | parsed directly (existing path)                                                                                                                                                    |
| `.csv`, `.txt`, `.xyz` | split per-line, expect 3 numeric cols → `{x,y,z}`                                                                                                                                  |
| `.ply` (ASCII)         | header parse → vertex section → points                                                                                                                                             |
| `.obj`                 | extract `v x y z` lines                                                                                                                                                            |
| `.glb`/`.gltf`         | use `three/examples/jsm/loaders/GLTFLoader` to extract mesh vertices                                                                                                               |
| `.png`/`.jpg`/`.webp`  | POST to `/api/ai-vision` with prompt "extract a representative {x,y,z} point cloud of the visible structure, ~800 points, ground at y=0, return JSON only" → Gemini returns points |
| `.pdf`                 | client-side render first page to canvas (pdfjs-dist) → same vision path                                                                                                            |
| anything else          | toast: "Unsupported, attempting AI inference" → vision path on a thumbnail if possible, else error                                                                                 |


Animated upload UX:

- Drag-over: dashed border morphs + neon glow pulse.
- During parse: progress ring with phase labels ("decoding…", "extracting vertices…", "asking Gemini Vision…").
- On success: points "rain" into the 3D viewport with staggered framer-motion entrance.
- On AI-inferred clouds: a small "AI-inferred" badge appears with a tooltip explaining the structure came from Gemini Vision, not direct geometry.

## 5. Additional animations sweep

- Buttons: tap-scale + radial ripple (single reusable `<FxButton>` wrapper).
- Cards: 3D tilt on hover (CSS `perspective` + framer-motion `useMotionValue`).
- Section transitions: `whileInView` fade/slide.
- 3D scene: bloom, slow auto-rotate, mouse-parallax, anomaly pulse already present.
- Route change: `AnimatePresence` cross-fade between `/` and `/app`.
- Sidebar: items slide in stagger on mount; active item gets `layoutId` underline.
- Terminal lines: per-line typewriter.
- Status beacon: morph between idle → scanning → verified/fraud states.

## 6. Files to add / change

```text
New:
  src/routes/app.tsx                    (moved dashboard)
  src/routes/index.tsx                  (rewritten as landing)
  src/components/landing/Hero3D.tsx
  src/components/landing/PipelineScroll.tsx
  src/components/landing/UseCaseBento.tsx
  src/components/landing/FaqAccordion.tsx
  src/components/landing/LandingHeader.tsx
  src/components/FxButton.tsx
  src/components/TiltCard.tsx
  src/lib/ingestion/index.ts            (dispatcher)
  src/lib/ingestion/parseJson.ts
  src/lib/ingestion/parseCsvXyz.ts
  src/lib/ingestion/parsePly.ts
  src/lib/ingestion/parseObj.ts
  src/lib/ingestion/parseGltf.ts
  src/lib/ingestion/visionInfer.ts      (calls /api/ai-vision)
  src/routes/api/ai-vision.ts

Edited:
  src/routes/api/ai-chat.ts             (Gemini SSE instead of Lovable)
  src/components/AICopilot.tsx          (Gemini chunk shape)
  src/components/DropZone.tsx           (universal ingestion + animations)
  src/components/Sidebar.tsx            (link → /app, hide on /)
  src/routes/__root.tsx                 (conditional chrome: hide sidebar on /)
  src/routes/settings.tsx               (Gemini key status row)

Deps to add: pdfjs-dist
(three, framer-motion, @react-three/drei already installed.)
```

## 7. Open question — only one

The Gemini key you pasted is now public. **Please revoke it in Google AI Studio**, generate a new one, and confirm you want me to store the new one as `GEMINI_API_KEY` (server secret). I'll request it via the secrets prompt after you approve this plan — do NOT paste the new key in chat.

All other choices (move dashboard to `/app`, no auth on landing, vision fallback for unknown files) I'll proceed with unless you say otherwise.

Build the Oracle Logs page to show searchable validation history with timestamps, input scenario names, and pass/fail status.Add automated tests that confirm the TS validator and Python reference produce the same zk_mock_hash for both valid and fraudulent datasets.Add an explanation panel that breaks down the AABB/gravity checks and highlights the specific points that triggered pass or fail.Implement a proof receipt viewer that fetches the attestation transaction receipt and displays relevant on-chain events.

Use smooth 3d realistic animation for everything.

Every thing must working really properly no simulation.