import { Suspense, useRef, type ReactElement } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Mail } from "lucide-react";
import * as THREE from "three";
import { dpr, isLowPower } from "@/lib/perf";
import { useInputFocusActive } from "@/hooks/use-input-focus-active";

/* Subtle rotating torus knot in the background */
function Knot({ paused }: { paused: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (paused) return;
    if (!ref.current) return;
    ref.current.rotation.x = clock.elapsedTime * 0.18;
    ref.current.rotation.y = clock.elapsedTime * 0.24;
  });
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={2.2} color="#7dd3fc" />
      <pointLight position={[-3, -2, -2]} intensity={1.4} color="#a78bfa" />
      <mesh ref={ref} scale={1.4}>
        <torusKnotGeometry args={[1, 0.32, isLowPower ? 96 : 220, isLowPower ? 16 : 32]} />
        <meshStandardMaterial
          color="#0ea5e9"
          emissive="#0ea5e9"
          emissiveIntensity={0.45}
          wireframe
          opacity={0.55}
          transparent
        />
      </mesh>
      {!isLowPower && (
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.15} luminanceSmoothing={0.4} />
        </EffectComposer>
      )}
    </>
  );
}

/* Brand SVG icons (Instagram + X, since lucide ships Mail but not these in a brand-safe way) */
function InstagramGlyph({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
function XGlyph({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.16 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type Card = {
  label: string;
  value: string;
  href: string;
  Icon: (p: { className?: string }) => ReactElement;
  hue: string;
};

const CARDS: Card[] = [
  {
    label: "Email",
    value: "adityagupta1234.in@gmail.com",
    href: "mailto:adityagupta1234.in@gmail.com",
    Icon: (p) => <Mail {...p} />,
    hue: "var(--primary)",
  },
  {
    label: "Instagram",
    value: "@agpro001",
    href: "https://instagram.com/agpro001",
    Icon: InstagramGlyph,
    hue: "#ec4899",
  },
  { label: "X", value: "@agpro001", href: "https://x.com/agpro001", Icon: XGlyph, hue: "#a78bfa" },
];

export function ContactSection() {
  const inputFocusActive = useInputFocusActive();

  return (
    <section
      id="contact"
      className="relative py-24 px-5 md:px-10 border-t border-border/40 overflow-hidden"
    >
      {/* 3D background */}
      <div className="absolute inset-0 -z-0 opacity-60 pointer-events-none gpu-layer">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          dpr={dpr()}
          frameloop={inputFocusActive ? "demand" : "always"}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        >
          <Suspense fallback={null}>
            <Knot paused={inputFocusActive} />
          </Suspense>
        </Canvas>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background/90 -z-0" />

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-12"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
            contact
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tighter mt-3">
            Reach the{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              architect
            </span>
            .
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm">
            Questions, partnerships, integrations — the inbox is open.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CARDS.map((c, i) => (
            <motion.a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("mailto") ? undefined : "_blank"}
              rel="noreferrer"
              initial={{ opacity: 0, y: 30, rotateX: -20 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 200, damping: 20 }}
              whileHover={{ y: -6, rotateZ: -0.6, transition: { type: "spring", stiffness: 300 } }}
              whileTap={{ scale: 0.97 }}
              className="group relative rounded-xl border border-border bg-surface/70 backdrop-blur-xl p-5 overflow-hidden block"
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.div
                className="absolute -inset-px rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `radial-gradient(220px circle at 30% 0%, ${c.hue}33, transparent 60%)`,
                }}
              />
              <div className="flex items-center gap-3 relative">
                <motion.div
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  className="size-12 rounded-lg grid place-items-center border"
                  style={{
                    color: c.hue,
                    borderColor: `${c.hue}55`,
                    background: `${c.hue}10`,
                    boxShadow: `0 0 30px -8px ${c.hue}66`,
                  }}
                >
                  <c.Icon className="size-6" />
                </motion.div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {c.label}
                  </div>
                  <div className="font-display font-semibold text-foreground break-all">
                    {c.value}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-[11px] font-mono uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                tap to open →
              </div>
            </motion.a>
          ))}
        </div>

        {/* Kinetic "Made by Aditya" */}
        <div className="mt-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-baseline gap-2"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              made by
            </span>
            <KineticWord word="Aditya" />
          </motion.div>
          <div className="mt-2 text-[11px] font-mono text-muted-foreground">
            © {new Date().getFullYear()} · SpatioTrust · built for the open web
          </div>
        </div>
      </div>
    </section>
  );
}

/* Per-letter kinetic motion — looks like depth-fall on entry */
function KineticWord({ word }: { word: string }) {
  return (
    <span className="font-display font-bold text-3xl md:text-4xl tracking-tighter">
      {Array.from(word).map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 24, rotateX: -90 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 + i * 0.06, type: "spring", stiffness: 220, damping: 14 }}
          whileHover={{
            y: -4,
            color: "var(--primary)",
            transition: { type: "spring", stiffness: 350 },
          }}
          className="inline-block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
          style={{ transformStyle: "preserve-3d" }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}
