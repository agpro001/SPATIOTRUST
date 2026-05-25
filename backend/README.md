# SpatioTrust — Python Reference Backend

This is a **reference implementation only**. The production demo runs the
identical validation logic as a TanStack Start server function inside the
main app (`src/lib/validator.ts` + `src/routes/api/validate-spatial-data.ts`),
because the deployment target (Cloudflare Workers) does not run Python.

This folder lets a reviewer inspect / run the validation engine in Python:

## Run

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install flask
python app.py
# POST a sample:
curl -X POST http://localhost:5000/api/validate-spatial-data \
  -H 'content-type: application/json' \
  --data @samples/valid_structure.json
curl -X POST http://localhost:5000/api/validate-spatial-data \
  -H 'content-type: application/json' \
  --data @samples/fraudulent_structure.json
```

## JSON contract

Request body: `Array<{x:number,y:number,z:number}>`

Response:
```json
{
  "status": "pass" | "fail",
  "confidence": 0.0-1.0,
  "anomaly_detected": true|false,
  "zk_mock_hash": "0x...",
  "metrics": { ... }
}
```