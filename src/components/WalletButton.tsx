import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Check, ChevronDown, LogOut } from "lucide-react";

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isBraveWallet?: boolean;
  isRabby?: boolean;
  isTrust?: boolean;
  providers?: Eip1193Provider[];
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

type WalletKey = "metamask" | "coinbase" | "brave" | "rabby" | "trust" | "injected";

type WalletOption = {
  key: WalletKey;
  label: string;
  match: (p: Eip1193Provider) => boolean;
  install: string;
};

const OPTIONS: WalletOption[] = [
  { key: "metamask", label: "MetaMask", match: (p) => !!p.isMetaMask && !p.isBraveWallet, install: "https://metamask.io/download/" },
  { key: "coinbase", label: "Coinbase Wallet", match: (p) => !!p.isCoinbaseWallet, install: "https://www.coinbase.com/wallet/downloads" },
  { key: "brave", label: "Brave Wallet", match: (p) => !!p.isBraveWallet, install: "https://brave.com/wallet/" },
  { key: "rabby", label: "Rabby", match: (p) => !!p.isRabby, install: "https://rabby.io/" },
  { key: "trust", label: "Trust Wallet", match: (p) => !!p.isTrust, install: "https://trustwallet.com/download" },
  { key: "injected", label: "Browser Wallet", match: () => true, install: "https://ethereum.org/en/wallets/find-wallet/" },
];

function pickProvider(key: WalletKey): Eip1193Provider | null {
  const root = window.ethereum;
  if (!root) return null;
  const list = root.providers && root.providers.length ? root.providers : [root];
  const opt = OPTIONS.find((o) => o.key === key)!;
  return list.find(opt.match) ?? (key === "injected" ? root : null);
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const STORAGE_KEY = "spatio:wallet";

export function WalletButton() {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<WalletKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<WalletKey | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { address: string; key: WalletKey };
      if (saved.address) {
        setAddress(saved.address);
        setActiveKey(saved.key);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!activeKey) return;
    const provider = pickProvider(activeKey);
    if (!provider?.on) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      if (!accounts || accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: accounts[0], key: activeKey }));
        } catch {
          /* ignore */
        }
      }
    };
    provider.on("accountsChanged", onAccounts);
    return () => provider.removeListener?.("accountsChanged", onAccounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  async function connect(key: WalletKey) {
    setError(null);
    const provider = pickProvider(key);
    if (!provider) {
      const opt = OPTIONS.find((o) => o.key === key)!;
      window.open(opt.install, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      setConnecting(key);
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
        setActiveKey(key);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: accounts[0], key }));
        } catch {
          /* ignore */
        }
        setOpen(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection rejected";
      setError(msg);
    } finally {
      setConnecting(null);
    }
  }

  function disconnect() {
    setAddress(null);
    setActiveKey(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 24 }}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background/60 backdrop-blur-md text-xs font-mono uppercase tracking-[0.15em] text-foreground hover:border-primary/60 hover:text-primary transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {address ? (
          <>
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <span>{short(address)}</span>
          </>
        ) : (
          <>
            <Wallet className="size-3.5" />
            <span>Connect</span>
          </>
        )}
        <ChevronDown className="size-3 opacity-60" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96, rotateX: -8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: -6, scale: 0.96, rotateX: -8 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            style={{ transformPerspective: 800 }}
            role="menu"
            className="absolute right-0 mt-2 w-64 rounded-md border border-border bg-popover/95 backdrop-blur-xl shadow-2xl shadow-primary/10 p-1.5 z-50"
          >
            {address ? (
              <div className="p-2 space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  connected · {OPTIONS.find((o) => o.key === activeKey)?.label ?? "wallet"}
                </div>
                <div className="font-mono text-xs break-all text-foreground">{address}</div>
                <button
                  type="button"
                  onClick={disconnect}
                  className="w-full mt-1 inline-flex items-center justify-center gap-2 h-8 rounded-md border border-border text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground hover:border-destructive/60 transition-colors"
                >
                  <LogOut className="size-3.5" /> Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  choose a wallet
                </div>
                {OPTIONS.map((opt) => {
                  const detected = typeof window !== "undefined" && !!pickProvider(opt.key);
                  const busy = connecting === opt.key;
                  return (
                    <motion.button
                      key={opt.key}
                      type="button"
                      whileHover={{ x: 2 }}
                      onClick={() => connect(opt.key)}
                      disabled={busy}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm text-foreground hover:bg-accent/60 disabled:opacity-60"
                    >
                      <span className="flex items-center gap-2">
                        <Wallet className="size-4 text-primary" />
                        {opt.label}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground inline-flex items-center gap-1">
                        {busy ? "connecting…" : detected ? (<><Check className="size-3 text-primary" /> ready</>) : "install"}
                      </span>
                    </motion.button>
                  );
                })}
                {error && (
                  <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-mono text-destructive">{error}</div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}