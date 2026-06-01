/**
 * Lightweight runtime perf tier detection. Used to tune Three.js dpr,
 * geometry detail, particle counts and animation cost on weaker devices
 * without removing any animation.
 */
export type PerfTier = "low" | "mid" | "high";

function detect(): { tier: PerfTier; reducedMotion: boolean } {
  if (typeof window === "undefined") {
    return { tier: "high", reducedMotion: false };
  }
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const cores = (navigator as any).hardwareConcurrency ?? 8;
  const mem = (navigator as any).deviceMemory ?? 8;
  const mobile = /Android.*Mobile|iPhone|iPod|Mobi/i.test(navigator.userAgent);
  let tier: PerfTier = "high";
  if (reduced || cores <= 4 || mem <= 4 || (mobile && cores <= 6)) tier = "low";
  else if (cores <= 8 || mobile) tier = "mid";
  return { tier, reducedMotion: reduced };
}

const cached = detect();

export const perfTier: PerfTier = cached.tier;
export const reducedMotion: boolean = cached.reducedMotion;
export const isLowPower = cached.tier === "low";

/** Cap pixel ratio for <Canvas dpr={dpr()}> based on tier. */
export function dpr(): [number, number] {
  if (cached.tier === "low") return [1, 1];
  if (cached.tier === "mid") return [1, 1.4];
  return [1, 1.8];
}

/** Suggested point-cloud sample cap for ingestion. */
export function pointCap(base = 6000): number {
  if (cached.tier === "low") return Math.min(base, 2500);
  if (cached.tier === "mid") return Math.min(base, 4500);
  return base;
}

/** Suggested geometry detail (e.g. icosahedron / torus) — 0..2 */
export function geomDetail(high = 2): number {
  if (cached.tier === "low") return Math.max(0, high - 2);
  if (cached.tier === "mid") return Math.max(0, high - 1);
  return high;
}
