import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Check, ChevronDown, LogOut, QrCode } from "lucide-react";

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

type WalletKey =
  | "metamask"
  | "coinbase"
  | "brave"
  | "rabby"
  | "trust"
  | "injected"
  | "walletconnect";

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
  if (typeof window === "undefined" || key === "walletconnect") return null;
  const root = window.ethereum;
  if (!root) return null;
  const list = root.providers && root.providers.length ? root.providers : [root];
  const opt = OPTIONS.find((o) => o.key === key);
  if (!opt) return null;
  return list.find(opt.match) ?? (key === "injected" ? root : null);
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const STORAGE_KEY = "spatio:wallet";
const WC_PROJECT_ID =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined) ??
  "3fcc6bba6f1de962d911bb5b5c3dba68";

let wcProviderPromise: Promise<Eip1193Provider> | null = null;
async function getWalletConnectProvider(): Promise<Eip1193Provider> {
  if (!wcProviderPromise) {
    wcProviderPromise = (async () => {
      const mod = await import("@walletconnect/ethereum-provider");
      const provider = await mod.EthereumProvider.init({
        projectId: WC_PROJECT_ID,
        chains: [1],
        optionalChains: [1, 137, 8453, 42161, 10],
        showQrModal: true,
        metadata: {
          name: "SpatioTrust",
          description: "Spatial oracle network",
          url: typeof window !== "undefined" ? window.location.origin : "https://spatiotrust.lovable.app",
          icons: ["https://spatiotrust.lovable.app/favicon.ico"],
        },
      });
      return provider as unknown as Eip1193Provider;
    })();
  }
  return wcProviderPromise;
}

export function WalletButton() {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<WalletKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<WalletKey | null>(null);

  const disconnect = useCallback(async () => {
    const prevKey = activeKey;
    setAddress(null);
    setActiveKey(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (prevKey === "walletconnect") {
      try {
        const p = await getWalletConnectProvider();
        await (p as unknown as { disconnect?: () => Promise<void> }).disconnect?.();
      } catch {
        /* ignore */
      }
      wcProviderPromise = null;
    }
  }, [activeKey]);

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
    let provider: Eip1193Provider | null = null;
    let cancelled = false;
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      if (!accounts || accounts.length === 0) {
        void disconnect();
      } else {
        setAddress(accounts[0]);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: accounts[0], key: activeKey }));
        } catch {
          /* ignore */
        }
      }
    };
    if (activeKey === "walletconnect") {
      void getWalletConnectProvider().then((p) => {
        if (cancelled) return;
        provider = p;
        p.on?.("accountsChanged", onAccounts);
      });
    } else {
      provider = pickProvider(activeKey);
      provider?.on?.("accountsChanged", onAccounts);
    }
    return () => {
      cancelled = true;
      provider?.removeListener?.("accountsChanged", onAccounts);
    };
  }, [activeKey, disconnect]);

  async function connect(key: WalletKey) {
    setError(null);
    try {
      setConnecting(key);
      let provider: Eip1193Provider | null;
      if (key === "walletconnect") {
        provider = await getWalletConnectProvider();
      } else {
        provider = pickProvider(key);
        if (!provider) {
          const opt = OPTIONS.find((o) => o.key === key)!;
          window.open(opt.install, "_blank", "noopener,noreferrer");
          return;
        }
      }
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

  const activeLabel =
    activeKey === "walletconnect"
      ? "WalletConnect"
      : OPTIONS.find((o) => o.key === activeKey)?.label ?? "wallet";

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.04, y: -1 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background/60 backdrop-blur-md text-xs font-mono uppercase tracking-[0.15em] text-foreground hover:border-primary/60 hover:text-primary hover:shadow-[0_0_24px_-8px_var(--primary-glow)] transition-[box-shadow,color,border-color]"
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
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 380, damping: 22 }}>
          <ChevronDown className="size-3 opacity-60" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.94, rotateX: -14 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: -8, scale: 0.95, rotateX: -10 }}
            transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.7 }}
            style={{ transformPerspective: 900, transformOrigin: "top right" }}
            role="menu"
            className="absolute right-0 mt-2 w-64 rounded-md border border-border bg-popover/95 backdrop-blur-xl shadow-2xl shadow-primary/10 p-1.5 z-50"
          >
            {address ? (
              <div className="p-2 space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  connected · {activeLabel}
                </div>
                <div className="font-mono text-xs break-all text-foreground">{address}</div>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  className="w-full mt-1 inline-flex items-center justify-center gap-2 h-8 rounded-md border border-border text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground hover:border-destructive/60 transition-colors"
                >
                  <LogOut className="size-3.5" /> Disconnect
                </button>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
                className="space-y-0.5"
              >
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
                      variants={{ hidden: { opacity: 0, x: -6 }, visible: { opacity: 1, x: 0 } }}
                      whileHover={{ x: 3, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 500, damping: 28 }}
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
                <motion.div
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                  className="my-1 h-px bg-border/60"
                />
                <motion.button
                  type="button"
                  variants={{ hidden: { opacity: 0, x: -6 }, visible: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  onClick={() => connect("walletconnect")}
                  disabled={connecting === "walletconnect"}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm text-foreground hover:bg-accent/60 disabled:opacity-60"
                >
                  <span className="flex items-center gap-2">
                    <QrCode className="size-4 text-primary" />
                    WalletConnect
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
                    {connecting === "walletconnect" ? "opening…" : "scan QR"}
                  </span>
                </motion.button>
                {error && (
                  <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-mono text-destructive">{error}</div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}