import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { Settings as SettingsIcon, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "SpatioTrust · Settings" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const wcProjectId = useApp((s) => s.wcProjectId);
  const setWcProjectId = useApp((s) => s.setWcProjectId);
  const autoNarrate = useApp((s) => s.autoNarrate);
  const setAutoNarrate = useApp((s) => s.setAutoNarrate);
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

      <section className="rounded-md border border-border bg-surface/60 p-5 space-y-3">
        <h2 className="font-display font-semibold">Wallet · WalletConnect</h2>
        <p className="text-sm text-muted-foreground">
          To enable mobile wallet QR connections, paste your free WalletConnect Cloud projectId.
          MetaMask works without this.
          <a
            className="ml-2 text-accent inline-flex items-center gap-1 hover:underline"
            href="https://cloud.walletconnect.com/"
            target="_blank"
            rel="noreferrer"
          >
            Get one <ExternalLink className="size-3" />
          </a>
        </p>
        <input
          value={wcProjectId}
          onChange={(e) => setWcProjectId(e.target.value.trim())}
          placeholder="WalletConnect projectId"
          className="w-full font-mono text-sm bg-input/60 border border-border rounded-md px-3 py-2 outline-none focus:border-primary/60"
        />
      </section>

      <section className="rounded-md border border-border bg-surface/60 p-5 space-y-3">
        <h2 className="font-display font-semibold">AI Co-pilot</h2>
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={autoNarrate}
            onChange={(e) => setAutoNarrate(e.target.checked)}
            className="size-4 accent-[color:var(--primary)]"
          />
          Auto-narrate validation results
        </label>
      </section>

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
            Chain: <span className="text-foreground">Sepolia (0xaa36a7)</span>
          </div>
          <div>
            Validation endpoint: <span className="text-foreground">/api/validate-spatial-data</span>
          </div>
          <div>
            AI endpoint: <span className="text-foreground">/api/ai-chat · AI Mesh</span>
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
