import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, ScrollText, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { BrandLogo } from "@/components/BrandLogo";

const items = [
  { to: "/app", label: "Mission Control", icon: Activity },
  { to: "/oracle-logs", label: "Oracle Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-sidebar/80 backdrop-blur-xl flex flex-col">
      <div className="px-5 py-5 border-b border-border flex items-center gap-3">
        <BrandLogo size={36} />
        <div>
          <div className="font-display font-semibold tracking-tight text-foreground">SpatioTrust</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Spatial Oracle Net
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it, i) => {
          const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <motion.div
              key={it.to}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
            <Link
              to={it.to}
              className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors border ${
                active
                  ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_24px_-12px_var(--primary-glow)]"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-2"
              }`}
            >
              <Icon className="size-4" />
              <span className="tracking-wide">{it.label}</span>
              {active && <span className="ml-auto size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary-glow)]" />}
            </Link>
            </motion.div>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border text-[10px] font-mono text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          quorum online · 3/3
        </div>
        <div>node: edge-eu-west-1</div>
        <div>chain: sepolia</div>
      </div>
    </aside>
  );
}