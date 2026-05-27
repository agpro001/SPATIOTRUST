import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, ChevronDown, Boxes, Sparkles, Zap, Layers, Cpu, Globe, Shield } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero3D } from "@/components/landing/Hero3D";
import { PipelineScroll } from "@/components/landing/PipelineScroll";
import { UseCaseBento } from "@/components/landing/UseCaseBento";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { FxButton } from "@/components/FxButton";
import { TiltCard } from "@/components/TiltCard";
import { ContactSection } from "@/components/ContactSection";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpatioTrust — Verify Reality Before You Release Capital" },
      { name: "description", content: "A decentralized spatial oracle network: validate real-world 3D point clouds, attest with zk-style commitments, and publish on-chain — powered by Gemini Vision." },
      { property: "og:title", content: "SpatioTrust — Decentralized Spatial Oracle Network" },
      { property: "og:description", content: "Validate real-world 3D environments before releasing DeFi capital. AI-powered ingestion, deterministic validation, on-chain attestation." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingHeader />
      <Hero />
      <Features />
      <PipelineScroll />
      <UseCaseBento />
      <Stack />
      <FaqAccordion />
      <FinalCta />
      <ContactSection />
      <Footer />
    </div>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <section ref={ref} className="relative h-screen min-h-[680px] flex items-center justify-center overflow-hidden">
      <Hero3D />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
      <motion.div style={{ y, opacity }} className="relative z-10 text-center px-5 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10 backdrop-blur font-mono text-[11px] uppercase tracking-[0.22em] text-primary"
        >
          <Sparkles className="size-3" /> live · gemini-powered oracle
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mt-6 leading-[0.95]"
        >
          Verify Reality.<br />
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Release Capital.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto"
        >
          A decentralized spatial oracle that validates real-world 3D environments —
          point clouds, photos, blueprints — before your smart contract pays out a single wei.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/app">
            <FxButton size="lg" glow>
              Launch Oracle <ArrowRight className="size-4" />
            </FxButton>
          </Link>
          <a href="#how">
            <FxButton size="lg" variant="secondary">How it works</FxButton>
          </a>
        </motion.div>
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground"
      >
        <ChevronDown className="size-6" />
      </motion.div>
    </section>
  );
}

const features = [
  { icon: Boxes, title: "Universal Ingest", desc: "JSON, CSV, PLY, OBJ, images, PDFs — anything you can scan, we can validate. Vision-powered fallback via Gemini." },
  { icon: Cpu, title: "Multi-Agent Consensus", desc: "Deterministic AABB + gravity + anomaly heuristics replicated across a simulated oracle quorum." },
  { icon: Shield, title: "ZK Attestation", desc: "Canonical sha-256 commitment — drop-in for a real Groth16 / PLONK proof when you're ready to ship." },
];

function Features() {
  return (
    <section className="relative py-32 px-5 md:px-10 border-t border-border/40">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">capabilities</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 tracking-tight">An oracle for the physical world</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 180 }}
              >
                <TiltCard>
                  <div className="h-full rounded-xl border border-border bg-surface/60 backdrop-blur p-7 hover:border-primary/40 transition-colors group">
                    <div className="size-12 rounded-lg grid place-items-center bg-primary/10 border border-primary/30 group-hover:shadow-[0_0_30px_-8px_var(--primary-glow)] transition-shadow">
                      <Icon className="size-6 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-xl mt-5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const stack = [
  { icon: Layers, name: "TanStack Start", desc: "Edge-rendered React 19 on Cloudflare Workers" },
  { icon: Zap, name: "react-three-fiber", desc: "GPU-instanced point cloud viewport with bloom" },
  { icon: Sparkles, name: "Gemini 2.0", desc: "Vision-driven structure inference + streaming chat" },
  { icon: Globe, name: "Ethers + WalletConnect", desc: "Sepolia attestation publishing for any wallet" },
];

function Stack() {
  return (
    <section id="stack" className="py-32 px-5 md:px-10 border-t border-border/40">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">under the hood</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 tracking-tight">Built on serious primitives</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stack.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, x: i % 2 ? 30 : -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-4 p-5 rounded-lg border border-border bg-surface/40 backdrop-blur"
              >
                <div className="size-10 shrink-0 rounded-md grid place-items-center bg-primary/10 border border-primary/30">
                  <Icon className="size-5 text-primary" />
                </div>
                <div>
                  <div className="font-display font-semibold">{s.name}</div>
                  <div className="text-sm text-muted-foreground">{s.desc}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative py-32 px-5 text-center overflow-hidden border-t border-border/40">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative z-10 max-w-2xl mx-auto"
      >
        <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter">
          Ready to attest?
        </h2>
        <p className="text-muted-foreground mt-4 text-lg">
          The oracle is live. Drop a file, sign the attestation, publish to Sepolia.
        </p>
        <div className="mt-8">
          <Link to="/app">
            <FxButton size="lg" glow>
              Launch Oracle <ArrowRight className="size-5" />
            </FxButton>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 py-10 px-5 md:px-10 text-sm text-muted-foreground">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BrandLogo size={22} />
          <span className="font-display font-semibold text-foreground">SpatioTrust</span>
          <span className="font-mono text-[10px] uppercase tracking-widest">v0.9.4</span>
        </div>
        <div className="font-mono text-[11px]">© {new Date().getFullYear()} · built for the open web</div>
      </div>
    </footer>
  );
}