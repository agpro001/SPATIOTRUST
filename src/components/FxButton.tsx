import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:shadow-[0_0_36px_-6px_var(--primary-glow)] border border-primary/40",
  secondary:
    "bg-surface-2/70 text-foreground border border-border hover:border-primary/40 hover:text-primary",
  ghost: "bg-transparent text-foreground hover:bg-surface-2/60 border border-transparent",
  danger:
    "bg-destructive text-destructive-foreground border border-destructive/40 hover:shadow-[0_0_30px_-6px_var(--destructive-glow)]",
};

type Props = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  glow?: boolean;
};

/** Reusable animated button: scale-tap + radial ripple on click. */
export const FxButton = forwardRef<HTMLButtonElement, Props>(function FxButton(
  { variant = "primary", size = "md", glow = false, className = "", children, onClick, ...rest },
  ref
) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 700);
    onClick?.(e as any);
  };

  const sizeCls =
    size === "lg"
      ? "px-7 py-3.5 text-base"
      : size === "sm"
      ? "px-3 py-1.5 text-xs"
      : "px-5 py-2.5 text-sm";

  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      onClick={handleClick as any}
      className={`relative overflow-hidden rounded-md font-display font-semibold tracking-wide transition-shadow ${
        variants[variant]
      } ${sizeCls} ${glow ? "shadow-[0_0_30px_-8px_var(--primary-glow)]" : ""} ${className}`}
      {...rest}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          initial={{ opacity: 0.55, scale: 0 }}
          animate={{ opacity: 0, scale: 4 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="pointer-events-none absolute size-32 rounded-full bg-white/30 mix-blend-overlay"
          style={{ left: r.x - 64, top: r.y - 64 }}
        />
      ))}
    </motion.button>
  );
});