import type { Point } from "@/lib/validator";

export type VisionResult = {
  points: Point[];
  description: string;
};

async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return { data: btoa(binary), mimeType: file.type || "image/png" };
}

/**
 * Send an image (or rendered PDF page) to Gemini Vision. The model returns a
 * synthesized {x,y,z}[] representative of the visible structure.
 */
export async function inferPointCloudFromImage(file: File): Promise<VisionResult> {
  const { data, mimeType } = await fileToBase64(file);
  const r = await fetch("/api/ai-vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: data, mimeType }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    throw new Error(e.error || `Vision API failed (${r.status})`);
  }
  return (await r.json()) as VisionResult;
}

/** Convenience for already-rendered canvases (e.g. PDF first page). */
export async function inferPointCloudFromBlob(
  blob: Blob,
  fileName = "render.png",
): Promise<VisionResult> {
  const file = new File([blob], fileName, { type: blob.type || "image/png" });
  return inferPointCloudFromImage(file);
}
