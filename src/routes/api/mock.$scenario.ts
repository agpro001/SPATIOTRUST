import { createFileRoute } from "@tanstack/react-router";
import { buildValidStructure, buildFraudulentStructure } from "@/lib/samples";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/mock/$scenario")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ params }) => {
        const scenario = params.scenario;
        let points;
        if (scenario === "valid") points = buildValidStructure();
        else if (scenario === "fraud") points = buildFraudulentStructure();
        else {
          return new Response(JSON.stringify({ error: "Unknown scenario" }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        return new Response(JSON.stringify({ scenario, points }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
