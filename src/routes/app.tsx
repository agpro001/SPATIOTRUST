import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useApp } from "@/lib/store";
import { DropZone } from "@/components/DropZone";
import { PointCloudScene } from "@/components/PointCloudScene";
import { LiveTerminal } from "@/components/LiveTerminal";
import { StatusBeacon } from "@/components/StatusBeacon";
import { PublishProofButton } from "@/components/PublishProofButton";
import { ContactSection } from "@/components/ContactSection";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "SpatioTrust · Mission Control" },
      { name: "description", content: "Operate the SpatioTrust spatial oracle: ingest, validate, attest, publish." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const points = useApp((s) => s.points);
  const result = useApp((s) => s.result);
  const isValidating = useApp((s) => s.isValidating);
  const scenarioLabel = useApp((s) => s.scenarioLabel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-5 space-y-5"
    >
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">mission control</div>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Spatial Oracle Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Drop a point cloud, image, or PDF. We validate, attest, and prepare it for on-chain publication.
          </p>
        </div>
        <div className="flex gap-3 text-[11px] font-mono">
          <Pill label="payload" value={scenarioLabel ?? "—"} />
          <Pill label="status" value={isValidating ? "PROCESSING" : result?.status?.toUpperCase() ?? "IDLE"} tone={result?.status} />
          <Pill label="confidence" value={result ? `${Math.round(result.confidence * 100)}%` : "—"} />
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
        <div className="space-y-5">
          <DropZone />
          <StatusBeacon />
          <PublishProofButton />
        </div>
        <div className="space-y-5 min-w-0">
          <motion.div
            layout
            className="h-[460px] xl:h-[520px]"
            animate={result?.status === "fail" ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <PointCloudScene points={points} result={result} isValidating={isValidating} />
          </motion.div>
          <LiveTerminal />
        </div>
      </div>
      <div className="-mx-5">
        <ContactSection />
      </div>
    </motion.div>
  );
}

function Pill({ label, value, tone }: { label: string; value: string; tone?: "pass" | "fail" }) {
  const cls =
    tone === "pass"
      ? "border-primary/40 text-primary bg-primary/10"
      : tone === "fail"
      ? "border-destructive/40 text-destructive bg-destructive/10"
      : "border-border text-foreground bg-surface";
  return (
    <div className={`rounded-md px-3 py-1.5 border ${cls}`}>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}