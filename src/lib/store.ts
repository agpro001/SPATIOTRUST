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
};

export const useApp = create<AppState>((set) => ({
  points: null,
  scenarioLabel: null,
  result: null,
  isValidating: false,
  activeStepIndex: -1,
  terminalLines: [
    { id: "boot", text: "[boot] spatiotrust oracle v0.9.3 — awaiting spatial payload …", tone: "info" },
  ],
  logs: [],
  wallet: null,
  wcProjectId: typeof window !== "undefined" ? localStorage.getItem("spatio:wc") ?? "" : "",
  autoNarrate: true,

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
  addLog: (log) => set((s) => ({ logs: [log, ...s.logs].slice(0, 50) })),
  attachTx: (id, tx) =>
    set((s) => ({ logs: s.logs.map((l) => (l.id === id ? { ...l, txHash: tx } : l)) })),
  setWallet: (wallet) => set({ wallet }),
  setWcProjectId: (id) => {
    if (typeof window !== "undefined") localStorage.setItem("spatio:wc", id);
    set({ wcProjectId: id });
  },
  setAutoNarrate: (autoNarrate) => set({ autoNarrate }),
}));