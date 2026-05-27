import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Github } from "lucide-react";
import { FxButton } from "@/components/FxButton";
import { BrandLogo } from "@/components/BrandLogo";

export function LandingHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 28 }}
      className="fixed top-0 inset-x-0 z-30 h-16 flex items-center justify-between px-5 md:px-10 bg-background/40 backdrop-blur-xl border-b border-border/40"
    >
      <Link to="/" className="flex items-center gap-2.5 group">
        <BrandLogo size={40} />
        <div className="flex flex-col leading-tight">
          <span className="font-display font-bold tracking-tight">SpatioTrust</span>
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground">spatial oracle net</span>
        </div>
      </Link>
      <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
        <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
        <a href="#usecases" className="hover:text-foreground transition-colors">Use cases</a>
        <a href="#stack" className="hover:text-foreground transition-colors">Stack</a>
        <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
      </nav>
      <div className="flex items-center gap-2">
        <a
          href="https://github.com/"
          target="_blank" rel="noreferrer"
          className="hidden md:grid place-items-center size-9 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          aria-label="GitHub"
        >
          <Github className="size-4" />
        </a>
        <Link to="/app">
          <FxButton size="sm" glow>Launch Oracle →</FxButton>
        </Link>
      </div>
    </motion.header>
  );
}