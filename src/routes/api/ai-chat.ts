import { createFileRoute } from "@tanstack/react-router";
import { streamChat } from "@/lib/aiFallback";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const SYSTEM_PROMPT = `You are the SpatioTrust Oracle Assistant — an AI co-pilot for a decentralized spatial oracle network that validates real-world 3D point-cloud data before releasing on-chain funds.

Personality: precise, calm, slightly cyberpunk. Keep answers concise (max ~6 short paragraphs or a small list). Use markdown. Refer to mock ZK proofs as "attestations".

You will sometimes be given a JSON validation context from the most recent run. When present, ground your answer in that data: explain why integrity passed or failed, point to which heuristic triggered (base support, centroid alignment, floating mass), and summarize the attestation hash.

If asked about the architecture, mention: deterministic AABB + gravity check, multi-agent consensus simulation, sha-256 commitment as a stand-in for a real Groth16/PLONK proof, and on-chain publication via eth_sendTransaction on Sepolia.`;

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const { messages, context, mode } = (await request.json()) as {
            messages: Array<{ role: "user" | "assistant"; content: string }>;
            context?: unknown;
            mode?: "explainer" | "fix";
          };
          const geminiKey = process.env.GEMINI_API_KEY;
          const gatewayKey = process.env.AI_GATEWAY_API_KEY;
          if (!geminiKey && !gatewayKey) {
            return jsonResp({ error: "No AI provider configured" }, 500);
          }

          const modeSuffix =
            mode === "explainer"
              ? "\n\nMODE: ANOMALY EXPLAINER. Output EXACTLY 3 bullets, each ≤ 22 words, naming the triggered heuristic (base support, centroid alignment, or floating mass) and the metric that proves it. No preamble."
              : mode === "fix"
              ? "\n\nMODE: FIX SUGGESTER. Output EXACTLY 3 numbered actions (≤ 20 words each) the operator can take on the source data to flip status from fail → pass. Reference at least one metric per action. No preamble."
              : "";

          const sys =
            SYSTEM_PROMPT +
            modeSuffix +
            (context
              ? `\n\nLatest validation context (do not echo verbatim; reason about it):\n\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``
              : "");

          const chat = await streamChat({
            system: sys,
            messages,
            geminiKey,
            gatewayKey,
          });

          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              try {
                for await (const delta of chat.iterate()) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
                  );
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
              "x-oracle-provider": chat.provider,
              "Access-Control-Expose-Headers": "x-oracle-provider",
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