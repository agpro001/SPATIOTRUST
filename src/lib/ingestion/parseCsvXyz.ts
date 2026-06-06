import type { Point } from "@/lib/validator";

/**
 * Parse CSV / TSV / TXT / XYZ files. Auto-detects delimiter.
 * Expects the first 3 numeric columns to be x, y, z.
 */
export async function parseCsvXyzFile(file: File): Promise<Point[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (lines.length < 4) throw new Error("File needs at least 4 data lines");
  const sample = lines[0];
  const delim = sample.includes(",") ? "," : sample.includes("\t") ? "\t" : /\s+/;
  const out: Point[] = [];
  // Detect header
  const firstCols = sample.split(delim as any).map((s) => s.trim());
  const hasHeader = firstCols.slice(0, 3).some((c) => isNaN(Number(c)));
  const start = hasHeader ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i]
      .split(delim as any)
      .map((s) => s.trim())
      .filter(Boolean);
    if (cols.length < 3) continue;
    const x = Number(cols[0]);
    const y = Number(cols[1]);
    const z = Number(cols[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      out.push({ x, y, z });
    }
  }
  if (out.length < 4) throw new Error("Could not extract enough numeric x,y,z rows");
  return out;
}
