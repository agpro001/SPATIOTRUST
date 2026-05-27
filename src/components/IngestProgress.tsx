import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/lib/store";

/**
 * Radial progress ring that visualises the current ingestion phase.
 * Hidden when phase is "idle" or "done".
 */
export function IngestProgress() {
  const phase = useApp((s) => s.ingestPhase);
  const pct = useApp((s) => s.ingestPct);
  const msg = useApp((s) => s.ingestMessage);

  const visible = phase !== "idle" && phase !== "done";
  const indeterminate = pct < 0;
  const clamped = Math.max(0, Math.min(1, pct));
  const r = 22, c = 2 * Math.PI * r;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 backdrop-blur px-3 py-2"
        >
          <div className="relative size-12 shrink-0">
            <svg viewBox="0 0 56 56" className="size-12 -rotate-90">
              <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
              <motion.circle
                cx="28" cy="28" r={r} fill="none"
                stroke="var(--primary)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={c}
                animate={
                  indeterminate
                    ? { strokeDashoffset: [c, c * 0.25, c], rotate: [0, 360] }
                    : { strokeDashoffset: c * (1 - clamped) }
                }
                transition={
                  indeterminate
                    ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.4, ease: "easeOut" }
                }
              />
            </svg>
            <motion.div
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="absolute inset-0 grid place-items-center text-[10px] font-mono text-primary"
            >
              {indeterminate ? "AI" : `${Math.round(clamped * 100)}%`}
            </motion.div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary">
              {phase.replace("-", " ")}
            </div>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={msg}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs text-foreground truncate max-w-[240px]"
              >
                {msg}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}