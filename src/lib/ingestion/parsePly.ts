import type { Point } from "@/lib/validator";

/** Minimal PLY (ASCII) parser — extracts vertex x,y,z. */
export async function parsePlyFile(file: File): Promise<Point[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/);
  let vertexCount = 0;
  let headerEnd = -1;
  let xIdx = -1,
    yIdx = -1,
    zIdx = -1;
  let propIdx = 0;
  let inVertex = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith("format") && !l.includes("ascii")) {
      throw new Error("Only ASCII PLY is supported in-browser");
    }
    if (l.startsWith("element vertex")) {
      vertexCount = parseInt(l.split(/\s+/)[2], 10);
      inVertex = true;
      propIdx = 0;
    } else if (l.startsWith("element")) {
      inVertex = false;
    } else if (inVertex && l.startsWith("property")) {
      const name = l.split(/\s+/).pop();
      if (name === "x") xIdx = propIdx;
      else if (name === "y") yIdx = propIdx;
      else if (name === "z") zIdx = propIdx;
      propIdx++;
    } else if (l === "end_header") {
      headerEnd = i + 1;
      break;
    }
  }
  if (headerEnd < 0 || xIdx < 0 || yIdx < 0 || zIdx < 0) {
    throw new Error("PLY header missing vertex x/y/z properties");
  }
  const out: Point[] = [];
  for (let i = headerEnd; i < headerEnd + vertexCount && i < lines.length; i++) {
    const cols = lines[i].trim().split(/\s+/);
    const x = Number(cols[xIdx]);
    const y = Number(cols[yIdx]);
    const z = Number(cols[zIdx]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      out.push({ x, y, z });
    }
  }
  if (out.length < 4) throw new Error("PLY contained no valid vertices");
  return out;
}
