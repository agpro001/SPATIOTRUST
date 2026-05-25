import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { ExternalLink, ScrollText } from "lucide-react";

export const Route = createFileRoute("/oracle-logs")({
  head: () => ({ meta: [{ title: "SpatioTrust · Oracle Logs" }] }),
  component: OracleLogs,
});

function OracleLogs() {
  const logs = useApp((s) => s.logs);
  return (
    <div className="p-5 space-y-5">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">audit trail</div>
        <h1 className="font-display text-3xl font-bold tracking-tight mt-1 flex items-center gap-3">
          <ScrollText className="size-7 text-primary" /> Oracle Logs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">In-memory log of every validation run this session.</p>
      </header>
      <div className="rounded-md border border-border bg-surface/60 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground font-mono text-sm">no runs yet — head to mission control</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2/70 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left p-3">When</th>
                <th className="text-left p-3">Scenario</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Conf.</th>
                <th className="text-left p-3">ZK attestation</th>
                <th className="text-left p-3">Tx</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-border font-mono text-[12px]">
                  <td className="p-3 text-muted-foreground">{new Date(l.timestamp).toLocaleTimeString()}</td>
                  <td className="p-3">{l.scenario}</td>
                  <td className={`p-3 ${l.result.status === "pass" ? "text-primary" : "text-destructive"}`}>
                    {l.result.status.toUpperCase()}
                  </td>
                  <td className="p-3">{Math.round(l.result.confidence * 100)}%</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}