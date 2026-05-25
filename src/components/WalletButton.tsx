import { useState } from "react";
import { Wallet, ChevronDown, LogOut, QrCode } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { connectInjected, connectWalletConnect, hasInjected, shortAddr } from "@/lib/web3";
import { useApp } from "@/lib/store";

export function WalletButton() {
  const wallet = useApp((s) => s.wallet);
  const setWallet = useApp((s) => s.setWallet);
  const wcProjectId = useApp((s) => s.wcProjectId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function tryMetaMask() {
    setBusy(true);
    try {
      if (!hasInjected()) {
        toast.error("No Web3 wallet detected. Install MetaMask or use WalletConnect.");
        return;
      }
      const w = await connectInjected();
      setWallet(w);
      toast.success(`Connected ${shortAddr(w.address)}`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Connection cancelled");
    } finally {
      setBusy(false);
    }
  }

  async function tryWalletConnect() {
    setBusy(true);
    try {
      const w = await connectWalletConnect(wcProjectId);
      setWallet(w);
      toast.success(`Connected via WalletConnect: ${shortAddr(w.address)}`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "WalletConnect cancelled");
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    try { wallet?.raw?.disconnect?.(); } catch {}
    setWallet(null);
    setOpen(false);
    toast.message("Wallet disconnected");
  }

  if (wallet) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3 py-2 text-sm font-mono text-primary shadow-[0_0_22px_-10px_var(--primary-glow)] transition-colors"
        >
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          {shortAddr(wallet.address)}
          <span className="text-muted-foreground">· sepolia</span>
          <ChevronDown className="size-3.5" />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-popover backdrop-blur-xl shadow-xl p-1 z-50"
            >
              <button
                onClick={disconnect}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-surface-2 text-foreground"
              >
                <LogOut className="size-4" /> Disconnect
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="flex items-center gap-2 rounded-md border border-border bg-surface hover:bg-surface-2 px-3 py-2 text-sm transition-colors"
      >
        <Wallet className="size-4 text-primary" />
        <span>Connect Wallet</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 mt-2 w-64 rounded-md border border-border bg-popover backdrop-blur-xl shadow-xl p-1 z-50"
          >
            <button onClick={tryMetaMask} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded hover:bg-surface-2 text-left">
              <Wallet className="size-4 text-warning" />
              <div>
                <div className="text-foreground">MetaMask / Injected</div>
                <div className="text-[11px] text-muted-foreground">Browser extension</div>
              </div>
            </button>
            <button onClick={tryWalletConnect} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded hover:bg-surface-2 text-left">
              <QrCode className="size-4 text-accent" />
              <div>
                <div className="text-foreground">WalletConnect</div>
                <div className="text-[11px] text-muted-foreground">Scan QR · mobile wallets</div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}