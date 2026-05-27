import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { validatePointCloud, type Point } from "@/lib/validator";

const PointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

const OptsSchema = z.object({
  baseSupportTolerance: z.number().min(0).max(0.5).optional(),
  confidenceSensitivity: z.number().min(0).max(1).optional(),
}).optional();

const BodySchema = z.union([
  z.array(PointSchema).min(4).max(200_000),
  z.object({
    points: z.array(PointSchema).min(4).max(200_000),
    opts: OptsSchema,
  }),
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export const Route = createFileRoute("/api/validate-spatial-data")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const raw = await request.json();
          const parsed = BodySchema.safeParse(raw);
          if (!parsed.success) {
            return json({ error: "Invalid point cloud", issues: parsed.error.issues }, 400);
          }
          const points: Point[] = Array.isArray(parsed.data) ? parsed.data : parsed.data.points;
          const opts = Array.isArray(parsed.data) ? undefined : parsed.data.opts;
          // Simulated multi-agent consensus latency
          await new Promise((r) => setTimeout(r, 2000));
          const result = await validatePointCloud(points, opts);
          return json(result, 200);
        } catch (e) {
          console.error("validate-spatial-data error:", e);
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