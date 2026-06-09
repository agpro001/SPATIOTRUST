import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { Settings as SettingsIcon } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "SpatioTrust · Settings" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const baseSupportTolerance = useApp((s) => s.baseSupportTolerance);
  const setBaseSupportTolerance = useApp((s) => s.setBaseSupportTolerance);
  const confidenceSensitivity = useApp((s) => s.confidenceSensitivity);
  const setConfidenceSensitivity = useApp((s) => s.setConfidenceSensitivity);

  return (
    <div className="p-5 space-y-6 max-w-3xl">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          configuration
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mt-1 flex items-center gap-3">
          <SettingsIcon className="size-7 text-primary" /> Settings
        </h1>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-md border border-border bg-surface/60 p-5 space-y-5"
      >
        <div>
          <h2 className="font-display font-semibold">Validation thresholds</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Tune how strict the oracle is. Higher confidence sensitivity rejects borderline
            structures; higher base-support tolerance accepts slightly off-centre buildings.
          </p>
        </div>
        <Slider
          label="Base support tolerance"
          value={baseSupportTolerance}
          min={0}
          max={0.5}
          step={0.01}
          onChange={setBaseSupportTolerance}
          format={(v) => `${(v * 100).toFixed(0)}% slack`}
        />
        <Slider
          label="Confidence sensitivity"
          value={confidenceSensitivity}
          min={0.3}
          max={0.95}
          step={0.01}
          onChange={setConfidenceSensitivity}
          format={(v) => `≥ ${(v * 100).toFixed(0)}% → pass`}
        />
      </motion.section>

      <section className="rounded-md border border-border bg-surface/60 p-5 space-y-2">
        <h2 className="font-display font-semibold">Network</h2>
        <div className="font-mono text-xs text-muted-foreground space-y-1">
          <div>
            Validation endpoint: <span className="text-foreground">/api/validate-spatial-data</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm text-foreground">{label}</label>
        <span className="text-[11px] font-mono text-primary">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[color:var(--primary)]"
      />
    </div>
  );
}
