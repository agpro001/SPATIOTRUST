import { motion } from "framer-motion";
import { TiltCard } from "@/components/TiltCard";
import { Building2, FileWarning, PackageSearch, Trees } from "lucide-react";

const cases = [
  {
    icon: Building2,
    title: "Construction Lending",
    desc: "Release tranches only when the on-site point cloud matches the planned milestone geometry.",
    accent: "from-primary/30 to-transparent",
    span: "md:col-span-2",
  },
  {
    icon: FileWarning,
    title: "Insurance Claims",
    desc: "Verify damage scans against pre-incident reference clouds before approving payouts.",
    accent: "from-accent/30 to-transparent",
    span: "",
  },
  {
    icon: PackageSearch,
    title: "Supply Chain",
    desc: "Attest that cargo dimensions match shipping manifests at every checkpoint.",
    accent: "from-primary/20 to-transparent",
    span: "",
  },
  {
    icon: Trees,
    title: "Carbon Credits",
    desc: "Stream LIDAR canopy scans into oracle attestations for verifiable reforestation credits.",
    accent: "from-accent/30 to-transparent",
    span: "md:col-span-2",
  },
];

export function UseCaseBento() {
  return (
    <section id="usecases" className="py-32 px-5 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">applications</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 tracking-tight">Where reality meets capital</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cases.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.08 }}
                className={c.span}
              >
                <TiltCard className="h-full">
                  <div className={`relative h-full min-h-[220px] rounded-xl border border-border bg-surface/60 backdrop-blur p-6 overflow-hidden bg-gradient-to-br ${c.accent}`}>
                    <Icon className="size-7 text-primary" />
                    <h3 className="font-display font-semibold text-xl mt-4">{c.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md">{c.desc}</p>
                    <div className="absolute -bottom-10 -right-10 size-40 rounded-full bg-primary/10 blur-3xl" />
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