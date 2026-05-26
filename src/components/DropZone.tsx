import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Boxes, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { PIPELINE_STEPS } from "@/lib/pipeline";
import type { Point, ValidationResult } from "@/lib/validator";
import { ingestFile, type IngestionResult } from "@/lib/ingestion";

export function DropZone() {
  const [dragging, setDragging] = useState(false);
  const [ingestPhase, setIngestPhase] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<IngestionResult["source"] | null>(null);
  const {
    isValidating, setPoints, startValidation, pushTerminal, setStepIndex, setResult, addLog,
  } = useApp();

  const runValidation = useCallback(
    async (points: Point[], label: string) => {
      setPoints(points, label);
      startValidation();
      pushTerminal(`[oracle] payload accepted · ${points.length.toLocaleString()} points · scenario=${label}`);

      // Drive the pipeline state machine in sync with the 2 s server delay
      const timers: ReturnType<typeof setTimeout>[] = [];
      PIPELINE_STEPS.forEach((step, i) => {
        timers.push(
          setTimeout(() => {
            setStepIndex(i);
            pushTerminal(`${step.label} — ${step.detail}`);
          }, step.delayMs)
        );
      });

      try {
        const res = await fetch("/api/validate-spatial-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(points),
        });
        const json = (await res.json()) as ValidationResult | { error: string };
        timers.forEach(clearTimeout);
        if (!res.ok || "error" in json) {
          const err = "error" in json ? json.error : `HTTP ${res.status}`;
          pushTerminal(`[oracle] validation rejected: ${err}`, "fail");
          toast.error(err);
          setResult(null);
          return;
        }
        if (json.status === "pass") {
          pushTerminal(`[oracle] ✓ INTEGRITY VERIFIED · confidence=${json.confidence}`, "ok");
        } else {
          pushTerminal(`[oracle] ✗ SPATIAL FRAUD DETECTED · confidence=${json.confidence}`, "fail");
          pushTerminal(`[circuit-breaker] on-chain release blocked. Manual override required.`, "fail");
        }
        pushTerminal(`[zk] attestation = ${json.zk_mock_hash}`, "ok");
        setResult(json);
        addLog({
          id: `${Date.now()}`,
          scenario: label,
          timestamp: Date.now(),
          result: json,
        });
      } catch (e) {
        timers.forEach(clearTimeout);
        const msg = e instanceof Error ? e.message : "Unknown error";
        pushTerminal(`[oracle] network failure: ${msg}`, "fail");
        toast.error(msg);
        setResult(null);
      }
    },
    [setPoints, startValidation, pushTerminal, setStepIndex, setResult, addLog]
  );

  const onFile = useCallback(
    async (file: File) => {
      try {
        setIngestPhase("decoding…");
        const res = await ingestFile(file, (_, msg) => setIngestPhase(msg));
        setLastSource(res.source);
        setIngestPhase(null);
        if (res.aiInferred) {
          toast.success(`Gemini Vision inferred ${res.points.length} points`);
        }
        await runValidation(res.points, file.name);
      } catch (e) {
        setIngestPhase(null);
        toast.error(e instanceof Error ? e.message : "Could not parse file");
      }
    },
    [runValidation]
  );

  const loadScenario = useCallback(
    async (scenario: "valid" | "fraud") => {
      try {
        const r = await fetch(`/api/mock/${scenario}`);
        const { points } = (await r.json()) as { points: Point[] };
        await runValidation(points, scenario === "valid" ? "valid_structure.json" : "fraudulent_structure.json");
      } catch (e) {
        toast.error("Could not load sample scenario");
      }
    },
    [runValidation]
  );

  return (
    <div className="rounded-md border border-border bg-surface/60 backdrop-blur p-5 space-y-4">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          spatial ingestion
        </div>
        <h2 className="font-display text-lg font-semibold tracking-tight mt-1">
          Upload point cloud
        </h2>
      </div>

      <motion.label
        htmlFor="spatio-file"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`relative block cursor-pointer rounded-md border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/10 shadow-[0_0_30px_-10px_var(--primary-glow)]"
            : "border-border hover:border-primary/50 hover:bg-surface-2/60"
        }`}
        animate={isValidating ? { scale: [1, 1.01, 1] } : { scale: 1 }}
        transition={{ duration: 1.4, repeat: isValidating ? Infinity : 0 }}
      >
        <input
          id="spatio-file"
          type="file"
          accept=".json,.csv,.tsv,.txt,.xyz,.ply,.obj,image/*,application/pdf"
          className="sr-only"
          disabled={isValidating}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        {isValidating || ingestPhase ? (
          <Loader2 className="mx-auto size-7 text-primary animate-spin" />
        ) : (
          <Upload className="mx-auto size-7 text-primary/80" />
        )}
        <div className="mt-3 text-sm text-foreground">
          {ingestPhase ?? (isValidating ? "Processing payload …" : "Drop any file — we'll figure it out")}
        </div>
        <div className="text-xs text-muted-foreground font-mono mt-1">
          JSON · CSV · XYZ · PLY · OBJ · PNG · JPG · PDF
        </div>
        <AnimatePresence>
          {lastSource && lastSource !== "json" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/15 border border-accent/40 text-accent"
            >
              <Sparkles className="size-3" /> source: {lastSource}{(lastSource === "image" || lastSource === "pdf") && " · ai-inferred"}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.label>

      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={isValidating}
          onClick={() => loadScenario("valid")}
          className="group rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/15 disabled:opacity-50 disabled:cursor-not-allowed p-3 text-left transition-colors"
        >
          <div className="flex items-center gap-2 text-primary">
            <Boxes className="size-4" />
            <div className="font-semibold text-sm">Load Valid Scenario</div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            6×6 building, base on y=0
          </div>
        </button>
        <button
          disabled={isValidating}
          onClick={() => loadScenario("fraud")}
          className="group rounded-md border border-destructive/30 bg-destructive/5 hover:bg-destructive/15 disabled:opacity-50 disabled:cursor-not-allowed p-3 text-left transition-colors"
        >
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            <div className="font-semibold text-sm">Load Fraud Scenario</div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            floating mass · no support
          </div>
        </button>
      </div>
    </div>
  );
}