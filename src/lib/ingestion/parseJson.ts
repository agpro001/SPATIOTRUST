import type { Point } from "@/lib/validator";

export async function parseJsonFile(file: File): Promise<Point[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const arr: unknown = Array.isArray(parsed) ? parsed : parsed?.points;
  if (!Array.isArray(arr)) throw new Error("JSON must be an array of {x,y,z} or {points:[…]}");
  const out: Point[] = [];
  for (const p of arr) {
    if (
      p && typeof p === "object" &&
      typeof (p as any).x === "number" &&
      typeof (p as any).y === "number" &&
      typeof (p as any).z === "number"
    ) {
      out.push({ x: (p as any).x, y: (p as any).y, z: (p as any).z });
    }
  }
  if (out.length < 4) throw new Error("Need at least 4 valid points");
  return out;
}