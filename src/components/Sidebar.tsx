import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, ScrollText, Settings, Shield } from "lucide-react";
import { motion } from "framer-motion";

const items = [
  { to: "/", label: "Overview", icon: Activity },
  { to: "/oracle-logs", label: "Oracle Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-sidebar/80 backdrop-blur-xl flex flex-col">
      <div className="px-5 py-5 border-b border-border flex items-center gap-3">
        <motion.div
          initial={{ rotate: -20, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220 }}
          className="size-9 rounded-md grid place-items-center bg-primary/15 border border-primary/40 shadow-[0_0_22px_-6px_var(--primary-glow)]"
        >
          <Shield className="size-5 text-primary" />
        </motion.div>
        <div>
          <div className="font-display font-semibold tracking-tight text-foreground">SpatioTrust</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Spatial Oracle Net
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
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