import type { Point } from "@/lib/validator";
import { parseJsonFile } from "./parseJson";
import { parseCsvXyzFile } from "./parseCsvXyz";
import { parsePlyFile } from "./parsePly";
import { parseObjFile } from "./parseObj";
import { parseGlbFile } from "./parseGlb";
import { inferPointCloudFromImage, inferPointCloudFromBlob } from "./visionInfer";

export type IngestionPhase = "decoding" | "parsing" | "rendering-pdf" | "ai-inference" | "done";

export type IngestionResult = {
  points: Point[];
  source: "json" | "csv" | "ply" | "obj" | "glb" | "image" | "pdf" | "ai";
  aiInferred: boolean;
  description?: string;
};

/** pct: 0..1 for known progress, -1 for indeterminate. */
export type ProgressFn = (phase: IngestionPhase, message: string, pct: number) => void;

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** Render the first page of a PDF to a PNG blob (client-side, pdfjs-dist). */
async function renderPdfFirstPage(file: File): Promise<Blob> {
  const pdfjs: any = await import(/* @vite-ignore */ "pdfjs-dist/build/pdf.mjs" as any);
  const worker: any = await import(/* @vite-ignore */ "pdfjs-dist/build/pdf.worker.mjs?url" as any);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
}

export async function ingestFile(file: File, onProgress?: ProgressFn): Promise<IngestionResult> {
  const ext = extOf(file.name);
  const mime = file.type;
  onProgress?.("decoding", `decoding ${file.name} (${(file.size / 1024).toFixed(1)} kB) …`, 0.05);

  // Direct geometry formats
  if (ext === "json" || mime === "application/json") {
    onProgress?.("parsing", "parsing JSON point cloud …", 0.4);
    return { points: await parseJsonFile(file), source: "json", aiInferred: false };
  }
  if (["csv", "tsv", "txt", "xyz"].includes(ext)) {
    onProgress?.("parsing", "parsing tabular x,y,z rows …", 0.4);
    return { points: await parseCsvXyzFile(file), source: "csv", aiInferred: false };
  }
  if (ext === "ply") {
    onProgress?.("parsing", "parsing PLY vertex section …", 0.4);
    return { points: await parsePlyFile(file), source: "ply", aiInferred: false };
  }
  if (ext === "obj") {
    onProgress?.("parsing", "extracting OBJ vertices …", 0.4);
    return { points: await parseObjFile(file), source: "obj", aiInferred: false };
  }
  if (ext === "glb" || ext === "gltf") {
    onProgress?.("parsing", "decoding GLB mesh vertices …", 0.4);
    return { points: await parseGlbFile(file), source: "glb", aiInferred: false };
  }

  // Visual formats → Gemini Vision
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
    onProgress?.("ai-inference", "AI Mesh vision is inferring spatial structure …", -1);
    const v = await inferPointCloudFromImage(file);
    return { points: v.points, source: "image", aiInferred: true, description: v.description };
  }
  if (ext === "pdf" || mime === "application/pdf") {
    onProgress?.("rendering-pdf", "rendering PDF page 1 …", 0.3);
    const blob = await renderPdfFirstPage(file);
    onProgress?.("ai-inference", "AI Mesh vision is inferring spatial structure …", -1);
    const v = await inferPointCloudFromBlob(blob, file.name.replace(/\.pdf$/i, ".png"));
    return { points: v.points, source: "pdf", aiInferred: true, description: v.description };
  }

  // Unknown — try AI as a last resort if it looks small + readable
  throw new Error(
    `Unsupported format ".${ext || mime || "?"}". Try JSON, CSV, XYZ, PLY, OBJ, GLB/GLTF, or an image / PDF.`,
  );
}
