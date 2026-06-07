# Plan: Remove typing surfaces + harden mobile 3D

## 1. Remove all typing input UI

**Chatbot (AICopilot)**

- Delete `src/components/AICopilot.tsx`.
- Remove import + `<AICopilot />` from `src/routes/__root.tsx`.

**Wallet**

- Delete `src/components/WalletButton.tsx`.
- Remove import + `<WalletButton />` from `src/routes/__root.tsx`.
- In `src/routes/settings.tsx`, delete the "Wallet · WalletConnect" `<section>` plus the `walletProjectIdDraft` `useState` and both `useEffect`s that sync it. Keep checkbox + slider controls (no typing). Remove the now-unused `wcProjectId` / `setWcProjectId` selectors and `useEffect`/`useState` imports if no longer referenced.
- Leave `wcProjectId` in the store and `src/lib/web3.ts` untouched — unused but harmless, avoids cascade changes.

After this, no text inputs remain in the shipped UI.

## 2. Global input-focus handler

Goal: any future `<input>` / `<textarea>` / contenteditable must not crash mobile Safari by leaving a WebGL context alive when the on-screen keyboard resizes the viewport.

- Convert `src/hooks/use-input-focus-active.ts` into a context-backed provider:
  - New `src/components/InputFocusProvider.tsx` mounts ONE document-level `focusin`/`focusout` listener and exposes `{ active, isMobile }` via context. `isMobile` from `navigator.userAgent` + `matchMedia("(max-width: 768px)")`, evaluated once and on resize.
  - `useInputFocusActive()` stays exported (re-reads from context) so existing call sites in `Hero3D.tsx`, `PointCloudScene.tsx`, `ContactSection.tsx` keep working without edits.
- Mount `<InputFocusProvider>` in `src/routes/__root.tsx` around `<Outlet />` so every route shares one listener.
- `Hero3D.tsx` keeps its current behavior: on mobile + focus active, unmount `<Canvas>` and render the `bg-[#06090f]` placeholder; on desktop keep canvas mounted but switch `frameloop` to `"demand"`.
- The AI orb canvas disappears with `AICopilot.tsx` — no extra wiring needed.

## 3. Distinct mobile vs desktop preview

- Desktop (`>=768px`, non-mobile UA): Hero3D renders full point cloud + Bloom (unchanged).
- Mobile (`<768px` OR mobile UA): Hero3D mounts a lighter variant — DPR capped at 1.5, Bloom disabled, particle count from `perfTier === "low"` path, canvas unmounted whenever any input is focused.
- Both branches gated by the provider so the behavior is consistent across all 3D surfaces.

## 4. Verification

- Confirm no remaining imports of `AICopilot` or `WalletButton`; no dangling references to removed setters.
- `/` on 441×730 mobile: Hero3D mounts, no orb in bottom-right, no wallet button in header.
- `/settings` on mobile + desktop: only checkbox + sliders, zero text fields.
- Desktop `/`: Hero3D + Bloom unchanged, header has no wallet button.
- Console clean, no "Failed to resolve import", no runtime errors.

## Files touched

- delete `src/components/AICopilot.tsx`
- delete `src/components/WalletButton.tsx`
- add `src/components/InputFocusProvider.tsx`
- edit `src/hooks/use-input-focus-active.ts` (read from provider context)
- edit `src/routes/__root.tsx` (remove imports/JSX, wrap with provider)
- edit `src/routes/settings.tsx` (remove wallet section + draft state)
- edit `src/components/landing/Hero3D.tsx` (use provider signal, mobile-tier branch)

No store schema changes, no new dependencies, no migrations.

After everything add new Chatbot and Wallet with same and other new working features. With smooth 3d live realistic animation. Everything must working properly correctly and Really.