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
/* Streaming chat                                                              */
/* -------------------------------------------------------------------------- */

export type ChatMsg = { role: "user" | "assistant"; content: string };

export type StreamedChat = {
  provider: Provider;
  /** Async iterator yielding text deltas already extracted from the upstream. */
  iterate(): AsyncGenerator<string, void, void>;
};

export async function streamChat(opts: {
  system: string;
  messages: ChatMsg[];
  geminiKey?: string;
  gatewayKey?: string;
}): Promise<StreamedChat> {
  const { system, messages, geminiKey, gatewayKey } = opts;

  // 1. Try Gemini direct
  if (geminiKey) {
    try {
      const r = await fetch(`${GEMINI_BASE}/gemini-2.0-flash:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          systemInstruction: { role: "system", parts: [{ text: system }] },
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      });
      if (r.ok && r.body) {
        return { provider: "gemini-direct", iterate: () => iterateGeminiSse(r.body!) };
      }
      const text = await r.text().catch(() => "");
      console.warn(`[ai-mesh] gemini failed ${r.status} → falling back`, text.slice(0, 200));
      if (!FALLBACK_STATUSES.has(r.status)) {
        throw new Error(`Gemini error ${r.status}: ${text.slice(0, 200)}`);
      }
    } catch (e) {
      console.warn("[ai-mesh] gemini network error → falling back", e);
    }
  }

  // 2. Fallback: Lovable AI Gateway (OpenAI-compatible)
  if (!gatewayKey) {
    throw new Error("Both Gemini and AI Mesh providers are unavailable");
  }
  const sysAsUser: ChatMsg[] = [{ role: "user", content: `(system)\n${system}` }, ...messages];
  const r = await fetch(`${GATEWAY_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gatewayKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      stream: true,
      messages: sysAsUser.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!r.ok || !r.body) {
    const t = await r.text().catch(() => "");
    throw new Error(`AI Mesh gateway error ${r.status}: ${t.slice(0, 200)}`);
  }
  return { provider: "ai-mesh-gateway", iterate: () => iterateOpenAiSse(r.body!) };
}

async function* iterateGeminiSse(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload);
        const parts = j?.candidates?.[0]?.content?.parts ?? [];
        for (const p of parts) if (typeof p?.text === "string" && p.text) yield p.text;
      } catch {
        /* ignore */
      }
    }
  }
}

async function* iterateOpenAiSse(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload);
        const delta = j?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) yield delta;
      } catch {
        /* ignore */
      }
    }
  }
}

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
