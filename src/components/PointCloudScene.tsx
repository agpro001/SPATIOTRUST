import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Edges, Float, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import type { Point, ValidationResult } from "@/lib/validator";
import { dpr, isLowPower } from "@/lib/perf";

type Props = {
  points: Point[] | null;
  result: ValidationResult | null;
  isValidating: boolean;
};

/**
 * GPU-instanced point cloud renderer.
 * Positions + colors live in BufferGeometry attributes (single buffer upload),
 * so heavy clouds don't stutter the React tree.
 */
function Cloud({ points, result, isValidating }: Props) {
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  const { positions, colors, center, size } = useMemo(() => {
    if (!points || points.length === 0) {
      return { positions: new Float32Array(0), colors: new Float32Array(0), center: new THREE.Vector3(), size: 6 };
    }
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    let xMin = Infinity, yMin = Infinity, zMin = Infinity;
    let xMax = -Infinity, yMax = -Infinity, zMax = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
      if (p.z < zMin) zMin = p.z; if (p.z > zMax) zMax = p.z;
    }
    const yRange = Math.max(yMax - yMin, 1e-3);
    const anomalySet = new Set<number>(result?.metrics.anomalyIndices ?? []);
    const isFail = result?.status === "fail";
    for (let i = 0; i < points.length; i++) {
      const t = (points[i].y - yMin) / yRange;
      if (result && anomalySet.has(i)) {
        // crimson anomaly
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.15;
        colors[i * 3 + 2] = 0.25;
      } else if (result && isFail) {
        // faded fail palette
        colors[i * 3] = 0.55 + t * 0.25;
        colors[i * 3 + 1] = 0.25;
        colors[i * 3 + 2] = 0.30;
      } else {
        // healthy: cyan → neon-green gradient
        colors[i * 3] = 0.25 + t * 0.10;
        colors[i * 3 + 1] = 0.85 + t * 0.10;
        colors[i * 3 + 2] = 0.50 + (1 - t) * 0.40;
      }
    }
    const center = new THREE.Vector3((xMin + xMax) / 2, (yMin + yMax) / 2, (zMin + zMax) / 2);
    const size = Math.max(xMax - xMin, yMax - yMin, zMax - zMin, 4);
    return { positions, colors, center, size };
  }, [points, result]);

  useEffect(() => {
    if (!geomRef.current) return;
    geomRef.current.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geomRef.current.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geomRef.current.computeBoundingSphere();
  }, [positions, colors]);

  // Subtle breathing on point size while validating
  useFrame(({ clock }) => {
    if (matRef.current) {
      const base = 0.07;
      matRef.current.size = isValidating
        ? base + Math.sin(clock.elapsedTime * 5) * 0.025
        : base;
    }
  });

  if (!points || points.length === 0) return null;

  const min = result?.metrics.bounds.min;
  const max = result?.metrics.bounds.max;

  return (
    <group position={[-center.x, -center.y + size / 4, -center.z]}>
      <points>
        <bufferGeometry ref={geomRef} />
        <pointsMaterial
          ref={matRef}
          vertexColors
          size={0.07}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </points>
      {min && max && (
        <mesh position={[(min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2]}>
          <boxGeometry args={[max.x - min.x, max.y - min.y, max.z - min.z]} />
          <meshBasicMaterial visible={false} />
          <Edges
            scale={1.001}
            color={result?.status === "fail" ? "#ff3a55" : "#5cffaa"}
          />
        </mesh>
      )}
    </group>
  );
}

function Placeholder() {
  return (
    <Float speed={1.4} rotationIntensity={0.6} floatIntensity={0.8}>
      <mesh>
        <boxGeometry args={[2.4, 2.4, 2.4]} />
        <meshBasicMaterial visible={false} />
        <Edges color="#5cffaa" />
      </mesh>
      <Html center>
        <div className="font-mono text-[11px] tracking-[0.2em] text-primary/70 uppercase whitespace-nowrap mt-24">
          awaiting spatial payload
        </div>
      </Html>
    </Float>
  );
}

export function PointCloudScene(props: Props) {
  const hasPoints = props.points && props.points.length > 0;
  return (
    <div className="relative w-full h-full rounded-md overflow-hidden border border-border bg-terminal-bg/60 scanlines gpu-layer">
      <Canvas
        dpr={dpr()}
        camera={{ position: [10, 8, 12], fov: 45 }}
        gl={{ antialias: !isLowPower, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0f1d"]} />
        <fog attach="fog" args={["#0a0f1d", 18, 60]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={0.6} />
        <Grid
          args={[40, 40]}
          position={[0, -3.5, 0]}
          cellColor="#1d3a4a"
          sectionColor="#2a8a6a"
          fadeDistance={30}
          fadeStrength={1.2}
          infiniteGrid
        />
        {hasPoints ? <Cloud {...props} /> : <Placeholder />}
        <OrbitControls enableDamping dampingFactor={0.08} maxDistance={50} minDistance={4} />
        {!isLowPower && (
          <EffectComposer>
            <Bloom intensity={0.7} luminanceThreshold={0.55} luminanceSmoothing={0.18} mipmapBlur />
          </EffectComposer>
        )}
      </Canvas>
      {/* HUD overlay */}
      <div className="absolute top-3 left-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground pointer-events-none">
        spatial viewport · orbit · zoom · pan
      </div>
      {props.result && (
        <div className="absolute bottom-3 left-3 right-3 font-mono text-[10px] grid grid-cols-2 md:grid-cols-4 gap-2 pointer-events-none">
          <Stat label="points" value={props.result.metrics.total.toString()} />
          <Stat label="base ratio" value={`${(props.result.metrics.baseRatio * 100).toFixed(1)}%`} />
          <Stat label="centroid sup." value={props.result.metrics.centroidSupported ? "✓" : "✗"} />
          <Stat label="floating mass" value={props.result.metrics.floatingMass ? "DETECTED" : "none"} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1 rounded bg-surface/70 backdrop-blur border border-border">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}