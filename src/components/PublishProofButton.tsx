import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { publishProof } from "@/lib/web3";

export function PublishProofButton() {
  const result = useApp((s) => s.result);
  const wallet = useApp((s) => s.wallet);
  const logs = useApp((s) => s.logs);
  const attachTx = useApp((s) => s.attachTx);
  const pushTerminal = useApp((s) => s.pushTerminal);
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);

  if (!result) return null;

  async function publish() {
    if (!wallet) {
      toast.error("Connect a wallet first (top-right).");
      return;
    }
    if (!result) return;
    setBusy(true);
    try {
      const hash = await publishProof(wallet, result.zk_mock_hash);
      setTx(hash);
      toast.success("Attestation submitted on Sepolia");
      pushTerminal(`[chain] attestation tx ${hash}`, "ok");
      const latest = logs[0];
      if (latest) attachTx(latest.id, hash);
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Transaction rejected");
    } finally {
      setBusy(false);
    }
  }

  const canPublish = result.status === "pass";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className="flex items-center gap-3 flex-wrap"
      >
        <button
          onClick={publish}
          disabled={busy || !canPublish}
          className={`group relative inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-all ${
            canPublish
              ? "bg-primary text-primary-foreground hover:shadow-[0_0_30px_-6px_var(--primary-glow)]"
              : "bg-surface-2 text-muted-foreground cursor-not-allowed"
          }`}
          title={canPublish ? "Sign a Sepolia attestation containing the zk hash" : "Cannot publish a failed attestation"}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {busy ? "Awaiting signature …" : canPublish ? "Publish Oracle Proof" : "Proof rejected — release blocked"}
        </button>
        {tx && (
          <a
            href={`https://sepolia.etherscan.io/tx/${tx}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-accent hover:underline"
          >
            view on etherscan <ExternalLink className="size-3" />
          </a>
        )}
      </motion.div>
    </AnimatePresence>
  );
}