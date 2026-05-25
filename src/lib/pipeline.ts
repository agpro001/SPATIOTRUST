/**
 * Deterministic pipeline state machine. Emits 6 timed terminal lines while a
 * validation request is in flight, keeping the terminal in sync with the
 * artificial 2 s server delay (each step ~ 350 ms, leaving slack on either end).
 */
export type PipelineStep = {
  id: string;
  label: string;
  detail: string;
  delayMs: number;
};

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "ingest", label: "[oracle] Ingesting spatial data", detail: "decoding JSON point cloud …", delayMs: 0 },
  { id: "agents", label: "[agents] Spinning up validator quorum", detail: "3/3 nodes online", delayMs: 250 },
  { id: "aabb", label: "[geom] Running AABB + gravity check", detail: "computing centroid + base footprint", delayMs: 600 },
  { id: "anomaly", label: "[scan] Sweeping for floating-mass anomalies", detail: "y-slice integrity audit", delayMs: 1000 },
  { id: "consensus", label: "[bft] Consensus across oracle agents", detail: "2/3+ threshold reached", delayMs: 1450 },
  { id: "zk", label: "[zk] Generating zk-mock attestation", detail: "sha-256 commitment over canonicalized cloud", delayMs: 1800 },
];