// SPA bootstrap used only by the Vercel build (see vite.config.vercel.ts).
// The Lovable/Cloudflare build ignores this file and renders via
// src/routes/__root.tsx `shellComponent` instead.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("#root element not found in index.html");
}

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
