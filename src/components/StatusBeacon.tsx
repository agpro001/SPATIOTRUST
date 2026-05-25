import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertOctagon, Loader2 } from "lucide-react";
import { useApp } from "@/lib/store";

export function StatusBeacon() {
  const isValidating = useApp((s) => s.isValidating);
  const result = useApp((s) => s.result);

  let state: "idle" | "processing" | "pass" | "fail" = "idle";
  if (isValidating) state = "processing";
  else if (result?.status === "pass") state = "pass";
  else if (result?.status === "fail") state = "fail";

  const conf = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div
      className={`relative rounded-md border p-6 transition-colors overflow-hidden ${
        state === "pass"
          ? "border-primary/50 bg-primary/5 pulse-success"
          : state === "fail"
          ? "border-destructive/60 strobe-danger"
          : "border-border bg-surface/60"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
        oracle attestation
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="flex items-start gap-4"
        >
          {state === "idle" && (
            <>
              <div className="size-12 rounded-full border border-border grid place-items-center bg-surface-2">
                <div className="size-3 rounded-full bg-muted-foreground/60" />
              </div>
              <div>
                <div className="text-xl font-semibold tracking-tight text-foreground">Awaiting payload</div>
                <div className="text-sm text-muted-foreground">Drop a JSON point cloud or load a sample scenario.</div>
              </div>
            </>
          )}
          {state === "processing" && (
            <>
              <Loader2 className="size-12 text-accent animate-spin" />
              <div>
                <div className="text-xl font-semibold tracking-tight text-foreground">Consensus in progress</div>
                <div className="text-sm text-muted-foreground font-mono">multi-agent quorum · zk attestation pending …</div>
              </div>
            </>
          )}
          {state === "pass" && (
            <>
              <CheckCircle2 className="size-12 text-primary drop-shadow-[0_0_18px_var(--primary-glow)]" />
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-bold tracking-tight text-primary">INTEGRITY VERIFIED</div>
                <div className="text-sm text-muted-foreground">Spatial structure cleared all heuristics. Confidence {conf}%.</div>
                <div className="mt-3 font-mono text-[11px] text-primary/90 truncate" title={result?.zk_mock_hash}>
                  zk: {result?.zk_mock_hash}
                </div>
              </div>
            </>
          )}
          {state === "fail" && (
            <>
              <motion.div animate={{ rotate: [0, -6, 6, -3, 3, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.4 }}>
                <AlertOctagon className="size-12 text-destructive drop-shadow-[0_0_18px_var(--destructive-glow)]" />
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-bold tracking-tight text-destructive">SPATIAL FRAUD DETECTED</div>
                <div className="text-sm text-destructive/80">Circuit breaker engaged. On-chain release blocked. Confidence {conf}%.</div>
                <div className="mt-3 font-mono text-[11px] text-destructive/90 truncate" title={result?.zk_mock_hash}>
                  zk: {result?.zk_mock_hash}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}