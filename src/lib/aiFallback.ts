/**
 * Shared helper: try the user's Gemini API key first; on quota/rate/credit
 * failures fall through to the Lovable AI Gateway (still Gemini under the
 * hood, but on the platform-managed key).
 *
 * Returns a Response-like envelope with the upstream stream/body and a
 * `provider` discriminator the caller can forward as a response header.
 */

export type Provider = "gemini-direct" | "ai-mesh-gateway";

export const FALLBACK_STATUSES = new Set([401, 402, 403, 429, 500, 502, 503]);

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GATEWAY_BASE = "https://ai.gateway.lovable.dev/v1";

/* -------------------------------------------------------------------------- */
/* Vision (non-streaming JSON)                                                 */
/* -------------------------------------------------------------------------- */

export type VisionResult = { provider: Provider; raw: string };

export async function visionToJson(opts: {
  prompt: string;
  imageBase64: string;
  mimeType: string;
  geminiKey?: string;
  gatewayKey?: string;
}): Promise<VisionResult> {
  const { prompt, imageBase64, mimeType, geminiKey, gatewayKey } = opts;

  if (geminiKey) {
    try {
      const r = await fetch(`${GEMINI_BASE}/gemini-2.0-flash:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || "image/png", data: imageBase64 } },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        }),
      });
      if (r.ok) {
        const data = (await r.json()) as any;
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return { provider: "gemini-direct", raw: text };
      }
      const t = await r.text().catch(() => "");
      console.warn(`[ai-mesh] vision gemini failed ${r.status}`, t.slice(0, 200));
      if (!FALLBACK_STATUSES.has(r.status)) throw new Error(`Gemini vision error ${r.status}`);
    } catch (e) {
      console.warn("[ai-mesh] vision gemini error → fallback", e);
    }
  }

  if (!gatewayKey) throw new Error("Both Gemini and AI Mesh providers are unavailable");

  const r = await fetch(`${GATEWAY_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${gatewayKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt + "\nReturn ONLY raw JSON, no markdown fences." },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType || "image/png"};base64,${imageBase64}` },
            },
          ],
        },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`AI Mesh vision error ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = (await r.json()) as any;
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  return { provider: "ai-mesh-gateway", raw: text };
}
