import { create } from "zustand";
import type { Point } from "./validator";
import type { ValidationResult } from "./validator";
import type { WalletState } from "./web3";

export type RunLog = {
  id: string;
  scenario: string;
  timestamp: number;
  result: ValidationResult;
  txHash?: string;
};

const LOG_KEY = "spatio:logs";
const THRESH_KEY = "spatio:thresh";

function loadLogs(): RunLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RunLog[];
  } catch {
    return [];
  }
}
function saveLogs(logs: RunLog[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 200)));
  } catch {
    /* ignore */
  }
}
function loadThresh(): { baseSupportTolerance: number; confidenceSensitivity: number } {
  if (typeof window === "undefined")
    return { baseSupportTolerance: 0.15, confidenceSensitivity: 0.7 };
  try {
    const raw = localStorage.getItem(THRESH_KEY);
    if (!raw) return { baseSupportTolerance: 0.15, confidenceSensitivity: 0.7 };
    const j = JSON.parse(raw);
    return {
      baseSupportTolerance: Number.isFinite(j.baseSupportTolerance) ? j.baseSupportTolerance : 0.15,
      confidenceSensitivity: Number.isFinite(j.confidenceSensitivity)
        ? j.confidenceSensitivity
        : 0.7,
    };
  } catch {
    return { baseSupportTolerance: 0.15, confidenceSensitivity: 0.7 };
  }
}

export type IngestPhase =
  | "idle"
  | "reading"
  | "decoding"
  | "parsing"
  | "rendering-pdf"
  | "vision"
  | "rendering"
  | "validating"
  | "done";

export type AppState = {
  points: Point[] | null;
  scenarioLabel: string | null;
  result: ValidationResult | null;
  isValidating: boolean;
  activeStepIndex: number; // -1 idle
  terminalLines: { id: string; text: string; tone: "info" | "ok" | "fail" }[];
  logs: RunLog[];
  wallet: WalletState | null;
  wcProjectId: string;
  autoNarrate: boolean;
  ingestPhase: IngestPhase;
  ingestPct: number; // 0..1, -1 = indeterminate
  ingestMessage: string;
  baseSupportTolerance: number; // 0..0.5
  confidenceSensitivity: number; // 0..1

  setPoints: (points: Point[] | null, label: string | null) => void;
  startValidation: () => void;
  setStepIndex: (i: number) => void;
  pushTerminal: (text: string, tone?: "info" | "ok" | "fail") => void;
  clearTerminal: () => void;
  setResult: (r: ValidationResult | null) => void;
  addLog: (log: RunLog) => void;
  attachTx: (id: string, tx: string) => void;
  setWallet: (w: WalletState | null) => void;
  setWcProjectId: (id: string) => void;
  setAutoNarrate: (v: boolean) => void;
  setIngest: (phase: IngestPhase, pct: number, message: string) => void;
  resetIngest: () => void;
  setBaseSupportTolerance: (v: number) => void;
  setConfidenceSensitivity: (v: number) => void;
  clearLogs: () => void;
};

export const useApp = create<AppState>((set) => ({
  points: null,
  scenarioLabel: null,
  result: null,
  isValidating: false,
  activeStepIndex: -1,
  terminalLines: [
    {
      id: "boot",
      text: "[boot] spatiotrust oracle v0.9.4 — awaiting spatial payload …",
      tone: "info",
    },
  ],
  logs: loadLogs(),
  wallet: null,
  wcProjectId: typeof window !== "undefined" ? (localStorage.getItem("spatio:wc") ?? "") : "",
  autoNarrate: true,
  ingestPhase: "idle",
  ingestPct: 0,
  ingestMessage: "",
  ...loadThresh(),

  setPoints: (points, scenarioLabel) => set({ points, scenarioLabel, result: null }),
  startValidation: () =>
    set({ isValidating: true, result: null, activeStepIndex: 0, terminalLines: [] }),
  setStepIndex: (i) => set({ activeStepIndex: i }),
  pushTerminal: (text, tone = "info") =>
    set((s) => ({
      terminalLines: [
        ...s.terminalLines,
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, tone },
      ],
    })),
  clearTerminal: () =>
    set({ terminalLines: [{ id: "clr", text: "[oracle] terminal cleared.", tone: "info" }] }),
  setResult: (result) => set({ result, isValidating: false, activeStepIndex: -1 }),
  addLog: (log) =>
    set((s) => {
      const logs = [log, ...s.logs].slice(0, 200);
      saveLogs(logs);
      return { logs };
    }),
  attachTx: (id, tx) =>
    set((s) => {
      const logs = s.logs.map((l) => (l.id === id ? { ...l, txHash: tx } : l));
      saveLogs(logs);
      return { logs };
    }),
  setWallet: (wallet) => set({ wallet }),
  setWcProjectId: (id) => {
    if (typeof window !== "undefined") localStorage.setItem("spatio:wc", id);
    set({ wcProjectId: id });
  },
  setAutoNarrate: (autoNarrate) => set({ autoNarrate }),
  setIngest: (ingestPhase, ingestPct, ingestMessage) =>
    set({ ingestPhase, ingestPct, ingestMessage }),
  resetIngest: () => set({ ingestPhase: "idle", ingestPct: 0, ingestMessage: "" }),
  setBaseSupportTolerance: (v) => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(THRESH_KEY);
        const cur = raw ? JSON.parse(raw) : {};
        localStorage.setItem(THRESH_KEY, JSON.stringify({ ...cur, baseSupportTolerance: v }));
      } catch {
        /* ignore */
      }
    }
    set({ baseSupportTolerance: v });
  },
  setConfidenceSensitivity: (v) => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(THRESH_KEY);
        const cur = raw ? JSON.parse(raw) : {};
        localStorage.setItem(THRESH_KEY, JSON.stringify({ ...cur, confidenceSensitivity: v }));
      } catch {
        /* ignore */
      }
    }
    set({ confidenceSensitivity: v });
  },
  clearLogs: () => {
    saveLogs([]);
    set({ logs: [] });
  },
}));
