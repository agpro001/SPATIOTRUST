import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, type RunLog } from "@/lib/store";
import { ExternalLink, ScrollText, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/oracle-logs")({
  head: () => ({ meta: [{ title: "SpatioTrust · Oracle Logs" }] }),
  component: OracleLogs,
});

type StatusFilter = "all" | "pass" | "fail";
type AnomalyFilter = "all" | "detected" | "clean";

function OracleLogs() {
  const logs = useApp((s) => s.logs);
  const clearLogs = useApp((s) => s.clearLogs);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [anomaly, setAnomaly] = useState<AnomalyFilter>("all");
  const [scenario, setScenario] = useState<string>("all");

  const scenarios = useMemo(
    () => Array.from(new Set(logs.map((l) => l.scenario))).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (status !== "all" && l.result.status !== status) return false;
      if (anomaly === "detected" && !l.result.anomaly_detected) return false;
      if (anomaly === "clean" && l.result.anomaly_detected) return false;
      if (scenario !== "all" && l.scenario !== scenario) return false;
      return true;
    });
  }, [logs, status, anomaly, scenario]);

  function exportCsv() {
    if (filtered.length === 0) {
      toast.error("No rows to export with current filters");
      return;
    }
    const header = ["timestamp", "scenario", "status", "confidence", "anomaly_detected", "zk_mock_hash", "tx_hash"];
    const rows = filtered.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.scenario,
      l.result.status,
      l.result.confidence.toString(),
      String(l.result.anomaly_detected),
      l.result.zk_mock_hash,
      l.txHash ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => {
        const s = String(cell ?? "");
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    a.href = url;
    a.download = `spatiotrust-logs-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} log${filtered.length === 1 ? "" : "s"}`);
  }

  return (
    <div className="p-5 space-y-5">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">audit trail</div>
        <div className="flex items-end justify-between gap-3 flex-wrap mt-1">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
              <ScrollText className="size-7 text-primary" /> Oracle Logs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Persistent audit trail of every validation run (capped at 200 entries).
            </p>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.94 }}
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 text-sm font-mono"
            >
              <Download className="size-4" /> Export CSV
              <span className="text-[10px] opacity-70">({filtered.length})</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                if (logs.length === 0) return;
                if (confirm("Clear all oracle logs? This cannot be undone.")) {
                  clearLogs();
                  toast.success("Logs cleared");
                }
              }}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface hover:bg-surface-2 text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-mono"
            >
              <Trash2 className="size-4" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Filter pills */}
      <div className="space-y-2">
        <PillGroup
          label="status"
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "pass", label: "Pass" },
            { value: "fail", label: "Fail" },
          ]}
        />
        <PillGroup
          label="anomaly"
          value={anomaly}
          onChange={(v) => setAnomaly(v as AnomalyFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "detected", label: "Detected" },
            { value: "clean", label: "Clean" },
          ]}
        />
        {scenarios.length > 0 && (
          <PillGroup
            label="scenario"
            value={scenario}
            onChange={setScenario}
            options={[
              { value: "all", label: "All" },
              ...scenarios.map((s) => ({ value: s, label: s })),
            ]}
          />
        )}
      </div>

      <div className="rounded-md border border-border bg-surface/60 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground font-mono text-sm">no runs yet — head to mission control</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground font-mono text-sm">
            no rows match the current filters
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2/70 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left p-3">When</th>
                <th className="text-left p-3">Scenario</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Conf.</th>
                <th className="text-left p-3">Anomaly</th>
                <th className="text-left p-3">ZK attestation</th>
                <th className="text-left p-3">Tx</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
              {filtered.map((l) => (
                <motion.tr
                  key={l.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="border-t border-border font-mono text-[12px]"
                >
                  <td className="p-3 text-muted-foreground">{new Date(l.timestamp).toLocaleTimeString()}</td>
                  <td className="p-3">{l.scenario}</td>
                  <td className={`p-3 ${l.result.status === "pass" ? "text-primary" : "text-destructive"}`}>
                    {l.result.status.toUpperCase()}
                  </td>
                  <td className="p-3">{Math.round(l.result.confidence * 100)}%</td>
                  <td className={`p-3 ${l.result.anomaly_detected ? "text-destructive" : "text-muted-foreground"}`}>
                    {l.result.anomaly_detected ? "detected" : "—"}
                  </td>
                  <td className="p-3 truncate max-w-[280px]" title={l.result.zk_mock_hash}>
                    {l.result.zk_mock_hash.slice(0, 14)}…{l.result.zk_mock_hash.slice(-6)}
                  </td>
                  <td className="p-3">
                    {l.txHash ? (
                      <a
                        className="text-accent hover:underline inline-flex items-center gap-1"
                        href={`https://sepolia.etherscan.io/tx/${l.txHash}`}
                        target="_blank" rel="noreferrer"
                      >
                        {l.txHash.slice(0, 10)}… <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PillGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground w-20">
        {label}
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <motion.button
              key={o.value}
              whileTap={{ scale: 0.94 }}
              onClick={() => onChange(o.value)}
              className={`relative px-3 py-1 rounded-full text-[11px] font-mono border transition-colors ${
                active
                  ? "border-primary/60 text-primary bg-primary/15"
                  : "border-border text-muted-foreground bg-surface hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`pill-${label}`}
                  className="absolute inset-0 rounded-full border border-primary/40 bg-primary/10"
                  transition={{ type: "spring", stiffness: 360, damping: 28 }}
                />
              )}
              <span className="relative">{o.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}