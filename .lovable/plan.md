# SpatioTrust — Build Plan

A production-quality prototype for a decentralized spatial oracle: ingest a 3D point cloud, run a deterministic geometry + gravity check, render a mock ZK proof hash, and let the user sign it on Sepolia via MetaMask or WalletConnect. Includes a 3D scene (react-three-fiber), a live cyber-terminal, and an AI co-pilot.

## Stack reconciliation (important)

The project runs on **TanStack Start on Cloudflare Workers** — there is no Python runtime in this app. We will:

- Implement the validation engine as a **TypeScript server function** (same AABB + gravity logic, same JSON I/O, same 2 s artificial delay). This is what powers the live demo.
- Also ship a `/backend` **Python reference** (`validator.py` + Flask `app.py` + the two mock JSONs) that runs identically offline — for the hackathon writeup / judges who want to inspect Python. It is not deployed.

Both implementations share the exact same JSON contract so the spec is preserved.

## Visual direction

Industrial cyber-security console. Slate-900 base, glass panels with subtle scanlines, **neon-green (#39FF14-ish, in oklch) for VERIFIED**, **crimson for FRAUD DETECTED**, monospace (JetBrains Mono) for terminal/data, Space Grotesk for UI. All colors as semantic tokens in `src/styles.css`. No raw Tailwind color classes in components.

## Architecture

```text
src/
  routes/
    __root.tsx                 sidebar shell, providers (QueryClient, Web3, Wallet, Toaster)
    index.tsx                  redirect or dashboard root
    dashboard.tsx              main split: Ingestion | Visualizer + Terminal + Status
    oracle-logs.tsx            history of validation runs (in-memory store)
    settings.tsx               wallet + AI options
    api/
      validate-spatial-data.ts POST endpoint (mirrors Python contract, accepts JSON upload)
      mock/$scenario.ts        GET valid|fraud sample datasets
      ai-chat.ts               streaming AI proxy to Lovable AI Gateway
  lib/
    validator.ts               AABB + gravity check + zk_mock_hash (shared logic)
    validator.functions.ts     createServerFn wrapper (used by the route handler too)
    web3/                      ethers provider, wallet connect modal, signing helper
    samples/                   valid_structure.ts, fraudulent_structure.ts (typed point clouds)
    pipeline.ts                step generator for terminal lines
  components/
    PointCloudScene.tsx        react-three-fiber: instanced points, AABB wireframe,
                               ground grid, OrbitControls, anomaly markers (red pulse)
    LiveTerminal.tsx           typewriter-streamed log, autoscroll, scanline overlay
    StatusBeacon.tsx           large glowing VERIFIED / FRAUD indicator with motion
    DropZone.tsx               drag-drop + "Load Valid" / "Load Fraud" buttons
    WalletButton.tsx           connect (MetaMask injected OR WalletConnect v2)
    PublishProofButton.tsx     triggers eth_sendTransaction with zk_mock_hash in data
    AICopilot.tsx              floating 3D-styled assistant: collapsed orb, expanded chat
    Sidebar.tsx                Overview / Oracle Logs / Settings
backend/                       (reference only, not deployed)
  validator.py
  app.py                       Flask /api/validate-spatial-data
  samples/valid_structure.json
  samples/fraudulent_structure.json
  README.md
```

## Validator logic (shared TS + Python)

Input: `Array<{x:number,y:number,z:number}>`.

1. Compute AABB (min/max per axis) and centroid (mean per axis).
2. Define base set = points with `y <= y_min + 0.1 * (y_max - y_min)`.
3. Compute base centroid (x,z mean of base set) and base footprint AABB on x/z.
4. **Gravity / support check**: centroid (x,z) must lie inside base footprint **and** `base_count / total_count >= 0.12` (enough mass at ground).
5. **Floating-mass check**: scan y-slices; if any non-base slice contains > 8% of points while the slice immediately below it contains 0 points → `anomaly_detected = true`.
6. `confidence` = weighted score of the two checks (0–1).
7. `zk_mock_hash` = `"0x" + sha256(JSON.stringify(sortedPoints) + status)` truncated to 64 hex chars.
8. Return `{ status: "pass"|"fail", confidence, anomaly_detected, zk_mock_hash, metrics: {...} }`.

`metrics` is added so the 3D scene can highlight the offending region (used by anomaly markers). Spec-compatible because original fields are preserved.

## Frontend flow

1. User drops a JSON file or clicks **Load Valid / Load Fraud** → fetch sample → POST to `/api/validate-spatial-data`.
2. While in-flight: `LiveTerminal` streams 6 pipeline lines on a timer (`pipeline.ts`), `StatusBeacon` shows "PROCESSING", `PointCloudScene` renders the points (color-graded by y).
3. On response: `StatusBeacon` switches to VERIFIED (green pulse) or FRAUD DETECTED (red strobe + screen-shake), scene highlights anomaly points in crimson with bloom, `PublishProofButton` appears.
4. Click **Publish Oracle Proof** → if wallet connected, `eth_sendTransaction` to user's own address (value 0, data = zk_mock_hash) on Sepolia → MetaMask/WalletConnect modal opens → toast on success/reject.

## Web3 layer

- `ethers v6` BrowserProvider for injected MetaMask.
- `@walletconnect/ethereum-provider` v2 for mobile (requires a public WalletConnect `projectId` — we ship a placeholder constant and surface a one-line toast telling the user to swap it in; no secret needed since it's a public ID).
- Network: Sepolia (`chainId 0xaa36a7`). If wrong chain, prompt `wallet_switchEthereumChain`, fall back to `wallet_addEthereumChain`.
- No provider installed → graceful toast ("No Web3 wallet detected — install MetaMask or use WalletConnect QR"), button disabled, demo still fully functional offline.

## AI co-pilot

- Floating bottom-right orb (animated with framer-motion + a subtle three.js-rendered icosahedron core). Click to expand into a chat panel.
- Backed by **Lovable AI Gateway** via `/api/ai-chat` server route (SSE streaming, `google/gemini-3-flash-preview` default). System prompt makes it the "SpatioTrust Oracle Assistant" with knowledge of the current validation result (we pass the last result as context).
- Capabilities: explain why a structure failed, summarize the zk proof, walk a judge through the demo, suggest next steps. Auto-narrates pipeline steps as they happen (optional toggle).
- Markdown rendering via `react-markdown`. Errors (429/402) surfaced as toasts per the AI Gateway guidance.

## 3D scene specifics

- `<Canvas>` with `dpr={[1,2]}`, `gl={{ antialias:true }}`, postprocessing bloom on anomaly points only.
- `<Points>` + `PointMaterial` (size-attenuated). Color ramp by y-height; override to crimson for indices in `metrics.anomalyIndices`.
- Animated AABB wireframe (`<Edges>`) drawn around the bounding box, dashed.
- Ground grid + soft fog. `OrbitControls` with damping. Auto-fit camera to AABB on each new dataset.
- Empty-state: slowly rotating wireframe cube placeholder.

## Dependencies to add

`three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `ethers`, `@walletconnect/ethereum-provider`, `framer-motion`, `react-markdown`, `zod` (validation), `clsx` (already present likely).

## Phased delivery (mapped to the brief)

1. **Phase 1 — Engine**: `lib/validator.ts`, samples (TS + Python mirrors in `/backend`), unit-style smoke via `invoke-server-function` after build.
2. **Phase 2 — API**: `routes/api/validate-spatial-data.ts` + `routes/api/mock/$scenario.ts`, 2 s simulated delay, Zod input validation, CORS headers.
3. **Phase 3 — Dashboard**: sidebar shell, DropZone, PointCloudScene, LiveTerminal, StatusBeacon, design tokens, Oracle Logs page (in-memory).
4. **Phase 4 — Web3 + AI**: WalletButton (MetaMask + WalletConnect), PublishProofButton with Sepolia signing, AI copilot with streaming chat and auto-narration. Final polish + QA pass on both scenarios.

## Guardrails honored

- No heavy 3D libs on the backend (Workers runtime); all 3D is client-only in `<Canvas>`.
- Graceful wallet fallback with toasts; demo works with zero wallet.
- All styling via Tailwind + semantic oklch tokens; only minimal keyframes for terminal cursor / scanline.
- Validator math kept intentionally simple but deterministic so the same input always yields the same `zk_mock_hash`.

## What I'll need from you mid-build

- A WalletConnect Cloud `projectId` (free, public). If you don't have one, I'll ship with a placeholder and a toast prompting you to paste it in Settings — the MetaMask path still works without it.
  &nbsp;

&nbsp;

### 1. The React-Three-Fiber Performance Safety Valve

&nbsp;

Rendering thousands of raw 3D vertices using standard React state updates will cause severe browser lag or UI stuttering during the analysis phase.

&nbsp;

* **The Fix:** Force the use of **`THREE.InstancedMesh`** or an optimized `<points>` object within the `<Canvas>` component. The point data should map positions to a single shared buffer attribute.

*  When a user uploads a heavy 3D point cloud, Lovable AI must update the point colors to a crimson strobe dynamically. Modifying individual React node properties iteratively will crash the DOM layout engine; a single native GPU shader attribute update will not.

&nbsp;

### 2. State Management Strategy for Multi-Step Terminal Syncing

&nbsp;

The plan outlines a beautiful UI sequence where a user uploads a file, a 2-second server latency is induced, and a simulated typewriter terminal prints matching real-time logs sequentially.

&nbsp;

* **The Fix:** You need a explicit **Sub-state State Machine** inside `lib/pipeline.ts`. When the async server function is pending, it must dispatch timed events (`STEP_1_PARSING`, `STEP_2_GEOMETRY_ANALYSIS`, `STEP_3_GENERATING_PROOF`) to sync the `<LiveTerminal>` typewriter text alongside the `<PointCloudScene>` visual states perfectly.

* If the server call finishes faster or slower than the text typewriter animation engine, the terminal logs will look completely out of sync with the actual web3 transaction popup.

&nbsp;

### 3. Smart Contract Simulation Data Structure

&nbsp;

Because TanStack Start is running purely serverless on the edge, you aren't deploying a real EVM smart contract bytecode directly to Sepolia.

&nbsp;

* **The Fix:** Your `PublishProofButton.tsx` script must execute a standard **Hex-encoded `eth_sendTransaction` data payload**. The data field should be explicitly structured with a dummy function selector hash appended directly to your `zk_mock_hash`:

&nbsp;

&nbsp;

---

&nbsp;

## 🎨 Expected Aesthetic Mockup

&nbsp;

To visualize the UI container layout, ensure your global styles map directly to a layout that positions the data pipeline directly opposite the viewport tracking elements:

&nbsp;

---

&nbsp;

## 🛠️ Updated Tech Stack Matrix

&nbsp;

Before telling the Lovable agent to start compiling the environment, ensure your final package lock includes these precise developer primitives:

&nbsp;

| Category | Primitive Package | Internal Use Case |

| --- | --- | --- |

| **3D Rendering** | `@react-three/fiber` + `@react-three/drei` | Instanced spatial coordinate tracking viewport engine. |

| **Web3 Core** | `ethers` (v6) | Injected provider integration hooks for local MetaMask instances. |

| **State Sync** | `framer-motion` | Smooth transition animation handling for UI modal toggles and status beacons. |

| **Data Sanity** | `zod` | Server-edge network sanitation pipelines for incoming JSON matrices. |

&nbsp;