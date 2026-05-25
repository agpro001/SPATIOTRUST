import type { Point } from "./validator";

/**
 * Valid structure: a dense cube/building shape resting on y = 0.
 * Footprint 6x6, height 5, ~1400 points (shell + a few internal floors).
 */
export function buildValidStructure(): Point[] {
  const pts: Point[] = [];
  const step = 0.5;
  // Solid base slab (y = 0..0.5)
  for (let x = -3; x <= 3; x += step) {
    for (let z = -3; z <= 3; z += step) {
      pts.push({ x, y: 0, z });
      pts.push({ x, y: 0.5, z });
    }
  }
  // Walls (shell) up to y = 5
  for (let y = 1; y <= 5; y += step) {
    for (let t = -3; t <= 3; t += step) {
      pts.push({ x: -3, y, z: t });
      pts.push({ x: 3, y, z: t });
      pts.push({ x: t, y, z: -3 });
      pts.push({ x: t, y, z: 3 });
    }
  }
  // Roof
  for (let x = -3; x <= 3; x += step) {
    for (let z = -3; z <= 3; z += step) {
      pts.push({ x, y: 5, z });
    }
  }
  // A couple internal floors for realism
  for (let x = -2.5; x <= 2.5; x += step) {
    for (let z = -2.5; z <= 2.5; z += step) {
      pts.push({ x, y: 2, z });
      pts.push({ x, y: 3.5, z });
    }
  }
  return jitter(pts, 0.03);
}

/**
 * Fraudulent structure: a small base + a large floating mass with a gap below it.
 */
export function buildFraudulentStructure(): Point[] {
  const pts: Point[] = [];
  const step = 0.5;
  // Tiny base footprint at origin (insufficient support)
  for (let x = -0.5; x <= 0.5; x += step) {
    for (let z = -0.5; z <= 0.5; z += step) {
      pts.push({ x, y: 0, z });
    }
  }
  // Single thin pillar up to y = 1 (then nothing)
  for (let y = 0.5; y <= 1; y += step) {
    pts.push({ x: 0, y, z: 0 });
  }
  // FLOATING mass: a 6x6x2 slab hovering at y = 3..4 with no support below
  for (let x = -3; x <= 3; x += step) {
    for (let z = -3; z <= 3; z += step) {
      for (let y = 3; y <= 4; y += step) {
        pts.push({ x, y, z });
      }
    }
  }
  // Even worse — a chunk floating off-center at y = 5
  for (let x = 3; x <= 5; x += step) {
    for (let z = -1; z <= 1; z += step) {
      pts.push({ x, y: 5, z });
    }
  }
  return jitter(pts, 0.03);
}

function jitter(pts: Point[], amount: number): Point[] {
  return pts.map((p) => ({
    x: p.x + (Math.random() - 0.5) * amount,
    y: p.y + (Math.random() - 0.5) * amount,
    z: p.z + (Math.random() - 0.5) * amount,
  }));
}