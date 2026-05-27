import { sha256Hex } from "./hash";

export type Point = { x: number; y: number; z: number };

export type ValidationMetrics = {
  total: number;
  baseCount: number;
  baseRatio: number;
  centroid: Point;
  baseCentroid: { x: number; z: number };
  centroidSupported: boolean;
  floatingMass: boolean;
  anomalyIndices: number[];
  bounds: { min: Point; max: Point };
};

export type ValidationResult = {
  status: "pass" | "fail";
  confidence: number;
  anomaly_detected: boolean;
  zk_mock_hash: string;
  metrics: ValidationMetrics;
};

export type ValidatorOpts = {
  /** 0..0.5 — extra slack when checking centroid lies inside base footprint. */
  baseSupportTolerance?: number;
  /** 0..1 — pass/fail confidence threshold (higher = stricter). */
  confidenceSensitivity?: number;
};

export async function validatePointCloud(
  points: Point[],
  opts: ValidatorOpts = {}
): Promise<ValidationResult> {
  const slackPct = clamp01(opts.baseSupportTolerance ?? 0.15) * 1; // already 0..0.5
  const sensitivity = clamp01(opts.confidenceSensitivity ?? 0.7);
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error("Empty point cloud");
  }

  // 1. AABB + centroid
  let xMin = Infinity, yMin = Infinity, zMin = Infinity;
  let xMax = -Infinity, yMax = -Infinity, zMax = -Infinity;
  let cx = 0, cy = 0, cz = 0;
  for (const p of points) {
    if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
    if (p.z < zMin) zMin = p.z; if (p.z > zMax) zMax = p.z;
    cx += p.x; cy += p.y; cz += p.z;
  }
  const n = points.length;
  cx /= n; cy /= n; cz /= n;

  const yRange = Math.max(yMax - yMin, 1e-6);

  // 2. Base set: lowest 10% of height
  const baseThreshold = yMin + 0.10 * yRange;
  const baseIndices: number[] = [];
  let bxMin = Infinity, bzMin = Infinity, bxMax = -Infinity, bzMax = -Infinity;
  let bcx = 0, bcz = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    if (p.y <= baseThreshold) {
      baseIndices.push(i);
      if (p.x < bxMin) bxMin = p.x; if (p.x > bxMax) bxMax = p.x;
      if (p.z < bzMin) bzMin = p.z; if (p.z > bzMax) bzMax = p.z;
      bcx += p.x; bcz += p.z;
    }
  }
  const baseCount = baseIndices.length;
  const baseRatio = baseCount / n;
  if (baseCount > 0) { bcx /= baseCount; bcz /= baseCount; }

  // 3. Centroid x,z must lie inside base footprint (with small slack)
  const slackX = slackPct * (xMax - xMin || 1);
  const slackZ = slackPct * (zMax - zMin || 1);
  const centroidInside =
    baseCount > 0 &&
    cx >= bxMin - slackX && cx <= bxMax + slackX &&
    cz >= bzMin - slackZ && cz <= bzMax + slackZ;
  const enoughBaseMass = baseRatio >= 0.12;
  const centroidSupported = centroidInside && enoughBaseMass;

  // 4. Floating-mass scan: 10 slices above base
  const sliceCount = 10;
  const sliceHeight = yRange / sliceCount;
  const sliceCounts = new Array(sliceCount).fill(0);
  const slicePoints: number[][] = Array.from({ length: sliceCount }, () => []);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    let s = Math.floor((p.y - yMin) / sliceHeight);
    if (s >= sliceCount) s = sliceCount - 1;
    if (s < 0) s = 0;
    sliceCounts[s]++;
    slicePoints[s].push(i);
  }
  let floatingMass = false;
  const anomalyIndices: number[] = [];
  for (let s = 2; s < sliceCount; s++) {
    const ratio = sliceCounts[s] / n;
    const below = sliceCounts[s - 1];
    if (ratio > 0.08 && below === 0) {
      floatingMass = true;
      anomalyIndices.push(...slicePoints[s]);
    }
  }

  // 5. Confidence + status
  const supportScore = centroidSupported ? 1 : 0.2;
  const floatScore = floatingMass ? 0.1 : 1;
  const massScore = Math.min(1, baseRatio / 0.20);
  const confidence = Math.max(0, Math.min(1, 0.45 * supportScore + 0.40 * floatScore + 0.15 * massScore));
  const status: "pass" | "fail" = confidence >= sensitivity && !floatingMass && centroidSupported ? "pass" : "fail";
  const anomaly_detected = floatingMass || !centroidSupported;

  // 6. ZK mock hash — deterministic
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
  const payload = JSON.stringify(sorted) + ":" + status;
  const hash = await sha256Hex(payload);

  return {
    status,
    confidence: Math.round(confidence * 1000) / 1000,
    anomaly_detected,
    zk_mock_hash: "0x" + hash,
    metrics: {
      total: n,
      baseCount,
      baseRatio: Math.round(baseRatio * 1000) / 1000,
      centroid: { x: round(cx), y: round(cy), z: round(cz) },
      baseCentroid: { x: round(bcx), z: round(bcz) },
      centroidSupported,
      floatingMass,
      anomalyIndices,
      bounds: {
        min: { x: round(xMin), y: round(yMin), z: round(zMin) },
        max: { x: round(xMax), y: round(yMax), z: round(zMax) },
      },
    },
  };
}

function round(v: number) {
  return Math.round(v * 1000) / 1000;
}

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}