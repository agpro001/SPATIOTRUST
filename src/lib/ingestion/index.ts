import type { Point } from "@/lib/validator";
import { parseJsonFile } from "./parseJson";
import { parseCsvXyzFile } from "./parseCsvXyz";
import { parsePlyFile } from "./parsePly";
import { parseObjFile } from "./parseObj";
import { inferPointCloudFromImage, inferPointCloudFromBlob } from "./visionInfer";

export type IngestionPhase =
  | "decoding"
  | "parsing"
  | "rendering-pdf"
  | "asking-gemini"
  | "done";

export type IngestionResult = {
  points: Point[];
  source: "json" | "csv" | "ply" | "obj" | "image" | "pdf" | "ai";
  aiInferred: boolean;
  description?: string;
};

export type ProgressFn = (phase: IngestionPhase, message: string) => void;

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** Render the first page of a PDF to a PNG blob (client-side, pdfjs-dist). */
async function renderPdfFirstPage(file: File): Promise<Blob> {
  // @ts-expect-error - pdfjs-dist subpath
  const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
  // @ts-expect-error - worker subpath
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = (worker as any).default;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width; canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
}

export async function ingestFile(file: File, onProgress?: ProgressFn): Promise<IngestionResult> {
  const ext = extOf(file.name);
  const mime = file.type;
  onProgress?.("decoding", `decoding ${file.name} (${(file.size / 1024).toFixed(1)} kB) …`);

  // Direct geometry formats
  if (ext === "json" || mime === "application/json") {
    onProgress?.("parsing", "parsing JSON point cloud …");
    return { points: await parseJsonFile(file), source: "json", aiInferred: false };
  }
  if (["csv", "tsv", "txt", "xyz"].includes(ext)) {
    onProgress?.("parsing", "parsing tabular x,y,z rows …");
    return { points: await parseCsvXyzFile(file), source: "csv", aiInferred: false };
  }
  if (ext === "ply") {
    onProgress?.("parsing", "parsing PLY vertex section …");
    return { points: await parsePlyFile(file), source: "ply", aiInferred: false };
  }
  if (ext === "obj") {
    onProgress?.("parsing", "extracting OBJ vertices …");
    return { points: await parseObjFile(file), source: "obj", aiInferred: false };
  }

  // Visual formats → Gemini Vision
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
    onProgress?.("asking-gemini", "Gemini Vision is inferring spatial structure …");
    const v = await inferPointCloudFromImage(file);
    return { points: v.points, source: "image", aiInferred: true, description: v.description };
  }
  if (ext === "pdf" || mime === "application/pdf") {
    onProgress?.("rendering-pdf", "rendering PDF page 1 …");
    const blob = await renderPdfFirstPage(file);
    onProgress?.("asking-gemini", "Gemini Vision is inferring spatial structure …");
    const v = await inferPointCloudFromBlob(blob, file.name.replace(/\.pdf$/i, ".png"));
    return { points: v.points, source: "pdf", aiInferred: true, description: v.description };
  }

  // Unknown — try AI as a last resort if it looks small + readable
  throw new Error(
    `Unsupported format ".${ext || mime || "?"}". Try JSON, CSV, XYZ, PLY (ASCII), OBJ, or an image / PDF.`
  );
}