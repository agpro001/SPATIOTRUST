import { createFileRoute } from "@tanstack/react-router";
import { visionToJson } from "@/lib/aiFallback";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const PROMPT = `You are a spatial-reconstruction model. Given the supplied image (a photo, render, plan, or screenshot of a real-world object, building, or scene), infer a representative 3-D point cloud that approximates the dominant visible structure.

Strict rules:
- Return ONLY raw JSON. No prose, no markdown fences.
- Schema: { "description": string (<= 240 chars), "points": Array<{ "x": number, "y": number, "z": number }> }
- Provide between 400 and 900 points.
- Ground / base should sit on y = 0. Up is +y.
- Coordinates roughly in meters, recentered on the origin (x,z).
- If the image shows a flawed / floating / unsupported structure, REFLECT that (e.g. include a clearly elevated cluster with no support beneath it).
- If you cannot infer any 3-D structure, still return a small representative box-shape and explain in description.`;

export const Route = createFileRoute("/api/ai-vision")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const { image, mimeType } = (await request.json()) as { image: string; mimeType: string };
          if (!image) return json({ error: "image (base64) required" }, 400);
          const geminiKey = process.env.GEMINI_API_KEY;
          const gatewayKey = process.env.LOVABLE_API_KEY;
          if (!geminiKey && !gatewayKey) return json({ error: "No AI provider configured" }, 500);

          const v = await visionToJson({
            prompt: PROMPT,
            imageBase64: image,
            mimeType,
            geminiKey,
            gatewayKey,
          });
          const text = v.raw;
          // Strip any accidental code fences
          const cleaned = text
            .trim()
            .replace(/^```(?:json)?/, "")
            .replace(/```$/, "")
            .trim();
          let parsed: any;
          try {
            parsed = JSON.parse(cleaned);
          } catch (e) {
            console.error("Vision response not JSON:", text.slice(0, 300));
            return json({ error: "Vision model returned non-JSON" }, 500);
          }
          const pts: any[] = Array.isArray(parsed?.points) ? parsed.points : [];
          const points = pts
            .filter(
              (p) =>
                p && typeof p.x === "number" && typeof p.y === "number" && typeof p.z === "number",
            )
            .map((p) => ({ x: p.x, y: p.y, z: p.z }));
          if (points.length < 20) {
            return json({ error: "Vision model did not return enough points" }, 500);
          }
          return jsonProv({ points, description: parsed.description ?? "" }, 200, v.provider);
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

function jsonProv(body: unknown, status: number, provider: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "x-oracle-provider": provider,
      "Access-Control-Expose-Headers": "x-oracle-provider",
      ...corsHeaders,
    },
  });
}
