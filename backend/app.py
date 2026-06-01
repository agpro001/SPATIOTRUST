"""Flask wrapper around validator.py — reference only.

The production demo uses the TypeScript port in src/lib/validator.ts.
Both produce the same zk_mock_hash for the same input.
"""
import json, time
from flask import Flask, request, jsonify
from validator import validate_point_cloud

app = Flask(__name__)

@app.after_request
def cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp

@app.route("/api/validate-spatial-data", methods=["POST", "OPTIONS"])
def validate():
    if request.method == "OPTIONS":
        return ("", 204)
    body = request.get_json(force=True)
    if isinstance(body, list):
        points, opts = body, None
    else:
        points = body.get("points", [])
        opts = body.get("opts") or None
    if not isinstance(points, list) or not points:
        return jsonify({"error": "Invalid point cloud"}), 400
    # simulated multi-agent consensus latency
    time.sleep(2)
    return jsonify(validate_point_cloud(points, opts))

@app.route("/api/mock/<scenario>")
def mock(scenario):
    path = f"samples/{'valid_structure' if scenario == 'valid' else 'fraudulent_structure'}.json"
    with open(path) as f:
        return jsonify({"scenario": scenario, "points": json.load(f)})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)