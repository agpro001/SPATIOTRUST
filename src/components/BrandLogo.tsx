import { motion } from "framer-motion";

/**
 * Animated SpatioTrust mark: hex shield + orbiting node ring + pulsing core.
 * Pure SVG, no DOM dependencies.
 */
export function BrandLogo({
  size = 36,
  variant = "compact",
  className = "",
}: {
  size?: number;
  variant?: "compact" | "hero";
  className?: string;
}) {
  const isHero = variant === "hero";
  return (
    <motion.svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      initial={{ opacity: 0, scale: 0.85, rotate: -15 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
      style={{
        filter: "drop-shadow(0 0 12px color-mix(in oklab, var(--primary) 55%, transparent))",
      }}
    >
      <defs>
        <linearGradient id="bl-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
        <radialGradient id="bl-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--primary-glow)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Hex shield */}
      <motion.path
        d="M32 4 L56 17 L56 42 L32 60 L8 42 L8 17 Z"
        fill="none"
        stroke="url(#bl-grad)"
        strokeWidth={2.2}
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />

      {/* Inner ring (rotates) */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: isHero ? 16 : 24, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "32px 32px" }}
      >
        <circle
          cx="32"
          cy="32"
          r="14"
          fill="none"
          stroke="var(--primary)"
          strokeOpacity={0.35}
          strokeDasharray="2 4"
        />
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const r = 14;
          const rad = (deg * Math.PI) / 180;
          const cx = 32 + r * Math.cos(rad);
          const cy = 32 + r * Math.sin(rad);
          return <circle key={deg} cx={cx} cy={cy} r={1.6} fill="var(--accent)" />;
        })}
      </motion.g>

      {/* Pulsing core */}
      <motion.circle
        cx="32"
        cy="32"
        r="6"
        fill="url(#bl-core)"
        animate={{ scale: [1, 1.18, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "32px 32px" }}
      />
      <circle cx="32" cy="32" r="2.6" fill="var(--primary-foreground)" />
    </motion.svg>
  );
}
