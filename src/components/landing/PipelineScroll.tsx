import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Upload, Cpu, ShieldCheck, Radio } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Ingest",
    desc: "Drop any spatial file. We auto-detect JSON, CSV, PLY, OBJ, images & PDFs.",
  },
  {
    icon: Cpu,
    title: "Validate",
    desc: "Multi-agent quorum runs AABB + gravity + anomaly heuristics off-chain.",
  },
  {
    icon: ShieldCheck,
    title: "Attest",
    desc: "Deterministic sha-256 over the canonicalized cloud — a mock zk-proof.",
  },
  {
    icon: Radio,
    title: "Publish",
    desc: "Sign and broadcast the attestation on Sepolia via MetaMask or WalletConnect.",
  },
];

export function PipelineScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 30%"] });
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="how" ref={ref} className="relative py-32 px-5 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
            pipeline
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 tracking-tight">
            How it works
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Four stages, all deterministic, all observable. No black boxes between the physical
            world and your smart contract.
          </p>
        </div>

        <div className="relative">
          {/* Track */}
          <div className="absolute top-12 left-0 right-0 h-0.5 bg-border" />
          <motion.div
            style={{ width }}
            className="absolute top-12 left-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary shadow-[0_0_18px_var(--primary-glow)]"
          />

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: i * 0.12, type: "spring", stiffness: 180 }}
                  className="text-center"
                >
                  <div className="mx-auto size-24 rounded-full grid place-items-center bg-surface/80 backdrop-blur border-2 border-primary/40 shadow-[0_0_30px_-8px_var(--primary-glow)] relative">
                    <Icon className="size-9 text-primary" />
                    <span className="absolute -top-2 -right-2 size-7 rounded-full bg-primary text-primary-foreground font-mono text-xs grid place-items-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-lg mt-4">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-[200px] mx-auto">
                    {s.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
