# SpatioTrust

**SpatioTrust** is a decentralized spatial oracle network that validates real-world 3D environments before smart contracts release capital.

Live site: https://spatiotrust.vercel.app
Dashboard: https://spatiotrust.vercel.app/app

## What it does

SpatioTrust helps verify the physical integrity of spatial data such as:

- point clouds
- photos
- blueprints
- JSON, CSV, XYZ
- PLY, OBJ, GLB
- PNG, JPG
- PDF files

It combines deterministic validation, AI-assisted fallback, and attestation to produce a confidence score and a mock zk-style commitment for review.

## Core idea

Instead of paying out funds based only on off-chain promises, SpatioTrust checks whether a real-world structure matches expected geometry and support conditions first.

That makes it useful for workflows like:

- construction lending
- insurance claims
- supply chain verification
- carbon credit attestation

## Main features

### Universal ingest
Accepts many spatial and document formats, then routes them through the correct validation path.

### Multi-agent consensus
Uses deterministic heuristics such as:

- axis-aligned bounding box checks
- gravity/support checks
- anomaly detection rules

### ZK attestation
Generates a canonical SHA-256 commitment as a stand-in for a future Groth16 or PLONK proof.

### Oracle logs
Stores an audit trail of validation runs so results can be reviewed later.

### Settings
Lets you tune validation behavior, including:

- base support tolerance
- confidence sensitivity

## How it works

1. **Ingest** — upload a file or load a scenario.
2. **Validate** — the oracle checks support, structure, and anomalies.
3. **Attest** — the system produces a deterministic hash commitment.
4. **Review** — inspect the confidence score, anomalies, and attestation.

## Routes

- `/` — marketing landing page
- `/app` — mission control dashboard
- `/oracle-logs` — audit trail of validation runs
- `/settings` — validation thresholds and network info

## Tech stack

This project is built with:

- **TanStack Start** — edge-rendered React 19 on Cloudflare Workers
- **react-three-fiber** — 3D point cloud viewport
- **Gemini 2.0** — vision-driven structure inference
- **TypeScript** — primary application language
- **CSS** — styling

## Project structure

The repo includes:

- a polished landing page with product messaging
- a spatial oracle dashboard
- a persistent oracle log viewer
- a settings screen for validation tuning
- a shared app store for state, logs, and thresholds

## Contact

**Aditya**  
Email: adityagupta1234.in@gmail.com  
Instagram / X: @agpro001

## About

SpatioTrust is built for the open web and positioned as a live spatial oracle for DeFi, infrastructure, and verification workflows.

© 2026 · SpatioTrust · built for the open web
