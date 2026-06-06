import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    q: "Is the zk-proof real?",
    a: "Not yet — SpatioTrust ships a deterministic sha-256 commitment over the canonicalized point cloud as a stand-in. The same architecture supports a real Groth16 / PLONK circuit; swapping the prover is a single module change.",
  },
  {
    q: "What file formats can I upload?",
    a: "JSON, CSV, TSV, TXT, XYZ, ASCII PLY, and Wavefront OBJ are parsed directly. Images (PNG / JPG / WebP) and PDFs are sent to Gemini Vision, which synthesizes a representative 3-D cloud you can then validate.",
  },
  {
    q: "Where does validation run?",
    a: "Inside a TanStack Start server function on Cloudflare Workers. The Python reference under /backend produces identical hashes for hackathon judges who want to verify the logic.",
  },
  {
    q: "Do I need MetaMask?",
    a: "No. MetaMask works out of the box, but you can also connect a mobile wallet via WalletConnect, or skip the wallet entirely and run the oracle for the visual demo.",
  },
  {
    q: "Is my data stored?",
    a: "No persistence. Point clouds are validated in-memory; only the attestation hash and metadata live in your browser's session.",
  },
];

export function FaqAccordion() {
  return (
    <section id="faq" className="py-32 px-5 md:px-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
            questions
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 tracking-tight">FAQ</h2>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border rounded-md bg-surface/40 backdrop-blur px-5"
              >
                <AccordionTrigger className="font-display font-medium hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
