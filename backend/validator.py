"""SpatioTrust validator — pure stdlib (no Open3D/PyTorch).

Mirrors src/lib/validator.ts byte-for-byte in spirit:
  1) AABB + centroid
  2) Base set = lowest 10% of height
  3) Centroid (x,z) must lie inside base footprint AND base mass >= 12%
  4) Floating-mass scan over 10 y-slices (>8% mass with 0 directly below = anomaly)
  5) Weighted confidence + zk_mock_hash = sha256(canonical_json + status)
"""
import hashlib, json, math, time

def _round(v: float) -> float:
    return round(v, 3)

def validate_point_cloud(points):
    if not points:
        raise ValueError("Empty point cloud")

    n = len(points)
    x_min = y_min = z_min = math.inf
    x_max = y_max = z_max = -math.inf
    cx = cy = cz = 0.0
    for p in points:
        x, y, z = p["x"], p["y"], p["z"]
        x_min = min(x_min, x); x_max = max(x_max, x)
        y_min = min(y_min, y); y_max = max(y_max, y)
        z_min = min(z_min, z); z_max = max(z_max, z)
        cx += x; cy += y; cz += z
    cx /= n; cy /= n; cz /= n
    y_range = max(y_max - y_min, 1e-6)

    base_thresh = y_min + 0.10 * y_range
    bx_min = bz_min = math.inf
    bx_max = bz_max = -math.inf
    bcx = bcz = 0.0
    base_idx = []
    for i, p in enumerate(points):
        if p["y"] <= base_thresh:
            base_idx.append(i)
            bx_min = min(bx_min, p["x"]); bx_max = max(bx_max, p["x"])
            bz_min = min(bz_min, p["z"]); bz_max = max(bz_max, p["z"])
            bcx += p["x"]; bcz += p["z"]
    base_count = len(base_idx)
    base_ratio = base_count / n
    if base_count:
        bcx /= base_count; bcz /= base_count

    slack_x = 0.05 * (x_max - x_min)
    slack_z = 0.05 * (z_max - z_min)
    centroid_inside = (
        base_count > 0
        and bx_min - slack_x <= cx <= bx_max + slack_x
        and bz_min - slack_z <= cz <= bz_max + slack_z
    )
    enough_base_mass = base_ratio >= 0.12
    centroid_supported = centroid_inside and enough_base_mass

    slice_count = 10
    slice_h = y_range / slice_count
    counts = [0] * slice_count
    slice_pts = [[] for _ in range(slice_count)]
    for i, p in enumerate(points):
        s = int((p["y"] - y_min) / slice_h)
        s = min(max(s, 0), slice_count - 1)
        counts[s] += 1
        slice_pts[s].append(i)

    floating_mass = False
    anomaly = []
    for s in range(2, slice_count):
        if counts[s] / n > 0.08 and counts[s - 1] == 0:
            floating_mass = True
            anomaly.extend(slice_pts[s])

    support_score = 1.0 if centroid_supported else 0.2
    float_score = 0.1 if floating_mass else 1.0
    mass_score = min(1.0, base_ratio / 0.20)
    confidence = max(0.0, min(1.0, 0.45 * support_score + 0.40 * float_score + 0.15 * mass_score))
    status = "pass" if confidence >= 0.7 and not floating_mass and centroid_supported else "fail"
    anomaly_detected = floating_mass or not centroid_supported

    sorted_pts = sorted(points, key=lambda p: (p["x"], p["y"], p["z"]))
    payload = json.dumps(sorted_pts, separators=(",", ":")) + ":" + status
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()

    return {
        "status": status,
        "confidence": round(confidence, 3),
        "anomaly_detected": anomaly_detected,
        "zk_mock_hash": "0x" + digest,
        "metrics": {
            "total": n,
            "baseCount": base_count,
            "baseRatio": round(base_ratio, 3),
            "centroid": {"x": _round(cx), "y": _round(cy), "z": _round(cz)},
            "baseCentroid": {"x": _round(bcx), "z": _round(bcz)},
            "centroidSupported": centroid_supported,
            "floatingMass": floating_mass,
            "anomalyIndices": anomaly,
            "bounds": {
                "min": {"x": _round(x_min), "y": _round(y_min), "z": _round(z_min)},
                "max": {"x": _round(x_max), "y": _round(y_max), "z": _round(z_max)},
            },
        },
    }

if __name__ == "__main__":
    import sys
    data = json.load(open(sys.argv[1]))
    pts = data if isinstance(data, list) else data["points"]
    t0 = time.time()
    print(json.dumps(validate_point_cloud(pts), indent=2))
    print(f"# elapsed: {(time.time()-t0)*1000:.1f} ms", file=sys.stderr)