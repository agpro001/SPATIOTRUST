import { Canvas, useFrame } from "@react-three/fiber";
import { Float, PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { dpr, perfTier, isLowPower } from "@/lib/perf";

/** Generates a building-shaped point cloud (procedural). */
function buildingPoints(): Float32Array {
  const out: number[] = [];
  const w = 3,
    d = 3,
    h = 4.5;
  const wallN = perfTier === "low" ? 700 : perfTier === "mid" ? 1200 : 1800;
  const roofN = perfTier === "low" ? 200 : perfTier === "mid" ? 350 : 500;
  const baseN = perfTier === "low" ? 280 : perfTier === "mid" ? 480 : 700;
  // Walls
  for (let i = 0; i < wallN; i++) {
    const face = Math.floor(Math.random() * 4);
    const u = Math.random();
    const y = Math.random() * h;
    let x = 0,
      z = 0;
    if (face === 0) {
      x = -w / 2 + u * w;
      z = -d / 2;
    } else if (face === 1) {
      x = -w / 2 + u * w;
      z = d / 2;
    } else if (face === 2) {
      x = -w / 2;
      z = -d / 2 + u * d;
    } else {
      x = w / 2;
      z = -d / 2 + u * d;
    }
    out.push(x, y, z);
  }
  // Roof
  for (let i = 0; i < roofN; i++) {
    out.push(-w / 2 + Math.random() * w, h + Math.random() * 0.05, -d / 2 + Math.random() * d);
  }
  // Base
  for (let i = 0; i < baseN; i++) {
    out.push(-w / 2 + Math.random() * w, 0, -d / 2 + Math.random() * d);
  }
  return new Float32Array(out);
}

function Building({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const positions = useMemo(() => buildingPoints(), []);
  const colors = useMemo(() => {
    const c = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const t = Math.min(1, y / 5);
      c[i] = 0.25 + t * 0.1;
      c[i + 1] = 0.85 + t * 0.1;
      c[i + 2] = 0.5 + (1 - t) * 0.4;
    }
    return c;
  }, [positions]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.y = t * 0.15 + mouse.current.x * 0.6;
    ref.current.rotation.x = -0.1 + mouse.current.y * 0.25;
    if (matRef.current) matRef.current.size = 0.045 + Math.sin(t * 1.5) * 0.005;
  });

  return (
    <points ref={ref} position={[0, -1.8, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        vertexColors
        size={0.05}
        sizeAttenuation
        transparent
        opacity={0.95}
        depthWrite={false}
      />
    </points>
  );
}

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const n = perfTier === "low" ? 220 : perfTier === "mid" ? 400 : 600;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() - 0.5) * 25;
    return arr;
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.04;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#5cffaa"
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </points>
  );
}

export function Hero3D() {
  const mouse = useRef({ x: 0, y: 0 });
  const [maxDpr, setMaxDpr] = useState(dpr()[1]);
  return (
    <div
      className="absolute inset-0 gpu-layer"
      onPointerMove={(e) => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        mouse.current.x = (e.clientX - r.left) / r.width - 0.5;
        mouse.current.y = (e.clientY - r.top) / r.height - 0.5;
      }}
    >
      <Canvas
        dpr={[1, maxDpr]}
        camera={{ position: [6, 3, 9], fov: 50 }}
        gl={{ antialias: !isLowPower, alpha: true, powerPreference: "high-performance" }}
      >
        <PerformanceMonitor
          onDecline={() => setMaxDpr((d) => Math.max(1, d - 0.25))}
          onIncline={() => setMaxDpr((d) => Math.min(dpr()[1], d + 0.1))}
        />
        <color attach="background" args={["#06090f"]} />
        <fog attach="fog" args={["#06090f", 14, 40]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 6, 4]} intensity={1.2} color="#5cffaa" />
        <Float speed={1} rotationIntensity={0.05} floatIntensity={0.2}>
          <Building mouse={mouse} />
        </Float>
        <Particles />
        {!isLowPower && (
          <EffectComposer>
            <Bloom intensity={1.0} luminanceThreshold={0.4} luminanceSmoothing={0.2} mipmapBlur />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
