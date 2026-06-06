import type { Point } from "@/lib/validator";

/** Extract `v x y z` lines from a Wavefront OBJ file. */
export async function parseObjFile(file: File): Promise<Point[]> {
  const text = await file.text();
  const out: Point[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("v ")) continue;
    const cols = line.trim().split(/\s+/);
    const x = Number(cols[1]);
    const y = Number(cols[2]);
    const z = Number(cols[3]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      out.push({ x, y, z });
    }
  }
  if (out.length < 4) throw new Error("OBJ contained no vertices");
  // Downsample if huge
  if (out.length > 12000) {
    const step = Math.ceil(out.length / 8000);
    return out.filter((_, i) => i % step === 0);
  }
  return out;
}
