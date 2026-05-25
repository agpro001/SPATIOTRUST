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
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

          const sys =
            SYSTEM_PROMPT +
            (context ? `\n\nLatest validation context:\n\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`` : "");

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [{ role: "system", content: sys }, ...messages],
              stream: true,
            }),
          });

          if (!upstream.ok) {
            if (upstream.status === 429) return json({ error: "Rate limit reached. Try again shortly." }, 429);
            if (upstream.status === 402) return json({ error: "AI credits exhausted. Add credits in workspace settings." }, 402);
            const t = await upstream.text();
            console.error("AI gateway error", upstream.status, t);
            return json({ error: "AI gateway error" }, 500);
          }
          return new Response(upstream.body, {
            status: 200,
            headers: { "Content-Type": "text/event-stream", ...corsHeaders },
          });
        } catch (e) {
          console.error(e);
          return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}