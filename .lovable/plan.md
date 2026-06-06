## Why Vercel deploys are failing today

Your project is a **Cloudflare Worker** build, not a Vercel build.

- `package.json` pins `@cloudflare/vite-plugin`, and `@lovable.dev/vite-tanstack-config` injects it into every `vite build` — output is a Cloudflare Worker bundle.
- `src/server.ts` is a Worker `export default { fetch }`, not a Node/Vercel function.
- `wrangler.jsonc` exists; `vercel.json` does not.
- Server routes under `src/routes/api/*` (`/api/ai-chat`, `/api/ai-vision`, `/api/validate-spatial-data`, `/api/mock/$scenario`) need a runtime Vercel doesn't provide for this template.

So Vercel runs `vite build`, gets a Worker bundle, can't serve it, and the preview is blank/erroring. Lovable's own hosting works because it runs the Worker on Cloudflare.

## Strategy: dual hosting

Keep the existing Cloudflare/Lovable build untouched (so `spatiotrust.lovable.app` and SSR + every `/api/*` route keep working for everyone). Add a **Vercel-only static SPA build** alongside it that:

1. Bypasses the Cloudflare plugin and TanStack Start SSR plugin.
2. Emits a plain client-rendered Vite bundle to `dist/`.
3. Rewrites `/api/*` requests to the Lovable-hosted backend so the AI Copilot, vision ingest, validator, and mock scenarios still work from the Vercel deployment.
4. Falls back to `index.html` for client-side routing.

This is the only path that "works properly for everyone" without breaking Lovable updates — the Lovable preset stays the default, Vercel uses its own config file.

## Files I'll add / change

1. **`vercel.json`** (new) — tells Vercel:
   - `buildCommand`: `vite build --config vite.config.vercel.ts`
   - `outputDirectory`: `dist`
   - `framework`: `null` (we drive Vite manually)
   - `rewrites`:
     - `/api/(.*)` → `https://spatiotrust.lovable.app/api/$1` (server routes served by Lovable hosting)
     - `/(.*)` → `/index.html` (SPA fallback)

2. **`vite.config.vercel.ts`** (new) — minimal Vite config WITHOUT the Lovable preset:
   - Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-tsconfig-paths`, `@tanstack/router-plugin/vite` in **`autoCodeSplitting` SPA mode** (no TanStack Start, no Cloudflare plugin).
   - `build.outDir = "dist"`, `build.ssr = false`.
   - `@` alias to `./src`.

3. **`src/entry.client.tsx`** (new) — SPA bootstrap used only by the Vercel build:
   - Creates `QueryClient`, calls `getRouter()`, mounts `<RouterProvider />` into `#root`.
   - Not wired into the Cloudflare build (which still uses `__root.tsx` `shellComponent`).

4. **`index.html`** (edit) — point the script tag at `/src/entry.client.tsx` (currently `/src/router.tsx`, which doesn't render anything). This is harmless to the Cloudflare build because Cloudflare SSR generates its own HTML shell via `__root.tsx` and ignores `index.html`.

5. **`src/lib/apiBase.ts`** (new) — tiny helper that returns `""` in dev / Lovable, and `""` on Vercel too (because `vercel.json` rewrites `/api/*` → Lovable). All existing `fetch("/api/...")` call sites keep working unchanged.

6. **`.vercelignore`** (new) — exclude `backend/`, `.tanstack/`, `.wrangler/`, `wrangler.jsonc` from the Vercel build context.

7. **README note** (append): one short section explaining the two deploy targets.

## What stays untouched

- `vite.config.ts`, `src/server.ts`, `wrangler.jsonc`, `src/routes/__root.tsx`, every component, every animation, every route file, the backend, and the validator.
- Lovable's preview + `spatiotrust.lovable.app` keep working exactly as today.

## Vercel project settings the user must set once

In the Vercel dashboard for the imported repo:

- **Framework Preset**: Other
- **Build Command**: leave blank (read from `vercel.json`)
- **Output Directory**: leave blank (read from `vercel.json`)
- **Install Command**: `bun install` (or leave default `npm install` — `package-lock.json` is committed)
- **Node version**: 20.x

No environment variables are required on Vercel — the AI keys (`GEMINI_API_KEY`, `LOVABLE_API_KEY`) stay on Lovable hosting and are reached via the `/api/*` rewrite.

## Verification I'll run before handing back

1. `bun install` clean.
2. `bunx vite build --config vite.config.vercel.ts` — must succeed and emit `dist/index.html` + assets.
3. Inspect `dist/index.html` to confirm the SPA shell + bundled entry script.
4. `bun run build` (the existing Cloudflare build) — must still succeed so Lovable hosting isn't broken.
5. Open `dist/index.html` mental walkthrough: client router boots, navigates to `/`, `/app`, `/oracle-logs`, `/settings`; AI Copilot `fetch("/api/ai-chat")` hits Vercel → rewritten to Lovable → streams back.
6. Re-read both `vercel.json` and `vite.config.vercel.ts` after writing to catch typos.

## After you approve and I implement

You push to GitHub → Vercel auto-builds → preview URL renders the full app, AI Copilot streams, vision ingest works, Oracle Logs filters + CSV export work, validator API responds. Lovable preview and `spatiotrust.lovable.app` continue working in parallel.
