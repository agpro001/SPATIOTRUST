import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const SYSTEM_PROMPT = `You are the SpatioTrust Oracle Assistant — an AI co-pilot for a decentralized spatial oracle network that validates real-world 3D point-cloud data before releasing on-chain funds.

Personality: precise, calm, slightly cyberpunk. Keep answers concise (max ~6 short paragraphs or a small list). Use markdown. Refer to mock ZK proofs as "attestations".

You will sometimes be given a JSON validation context from the most recent run. When present, ground your answer in that data: explain why integrity passed or failed, point to which heuristic triggered (base support, centroid alignment, floating mass), and summarize the attestation hash.

If asked about the architecture, mention: deterministic AABB + gravity check, multi-agent consensus simulation, sha-256 commitment as a stand-in for a real Groth16/PLONK proof, and on-chain publication via eth_sendTransaction on Sepolia.`;

/**
 * Streams a Gemini chat response back to the browser as SSE.
 * Each emitted `data:` line has the shape `{ "delta": "<token>" }`.
 */
export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const { messages, context } = (await request.json()) as {
            messages: Array<{ role: "user" | "assistant"; content: string }>;
            context?: unknown;
          };
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) return jsonResp({ error: "GEMINI_API_KEY missing on server" }, 500);

          const sys =
            SYSTEM_PROMPT +
            (context
              ? `\n\nLatest validation context (do not echo verbatim; reason about it):\n\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``
              : "");

          const contents = messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

          const upstream = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse",
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
              body: JSON.stringify({
                systemInstruction: { role: "system", parts: [{ text: sys }] },
                contents,
                generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
              }),
            }
          );

          if (!upstream.ok || !upstream.body) {
            const t = await upstream.text().catch(() => "");
            console.error("Gemini error", upstream.status, t);
            return jsonResp({ error: `Gemini error ${upstream.status}` }, 500);
          }

          // Translate Gemini's SSE `data: {…}` chunks into `data: {"delta":"…"}\n\n`
          const reader = upstream.body.getReader();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              let buf = "";
              try {
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  let nl: number;
                  while ((nl = buf.indexOf("\n")) !== -1) {
                    let line = buf.slice(0, nl);
                    buf = buf.slice(nl + 1);
                    if (line.endsWith("\r")) line = line.slice(0, -1);
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6).trim();
                    if (!payload) continue;
                    try {
                      const j = JSON.parse(payload);
                      const parts = j?.candidates?.[0]?.content?.parts ?? [];
                      for (const p of parts) {
                        if (typeof p?.text === "string" && p.text) {
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ delta: p.text })}\n\n`)
                          );
                        }
                      }
                    } catch { /* ignore partial chunks */ }
                  }
                }
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              } catch (e) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`)
                );
              } finally {
                controller.close();
              }
            },
          });

          return new Response(stream, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              ...corsHeaders,
            },
          });
        } catch (e) {
          console.error(e);
          return jsonResp({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
        }
      },
    },
  },
});

function jsonResp(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}