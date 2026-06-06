import { useEffect, useRef } from "react";
import { useApp } from "@/lib/store";

export function LiveTerminal() {
  const lines = useApp((s) => s.terminalLines);
  const isValidating = useApp((s) => s.isValidating);
  const clearTerminal = useApp((s) => s.clearTerminal);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="rounded-md border border-border bg-terminal-bg overflow-hidden flex flex-col scanlines">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface/60">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="size-2 rounded-full bg-destructive/80" />
          <span className="size-2 rounded-full bg-warning/80" />
          <span className="size-2 rounded-full bg-primary/80" />
          <span className="ml-3">spatiotrust · agent terminal</span>
        </div>
        <button
          onClick={clearTerminal}
          className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          clear
        </button>
      </div>
      <div
        ref={ref}
        className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed min-h-[180px] max-h-[260px]"
      >
        {lines.map((l) => (
          <div
            key={l.id}
            className={
              l.tone === "ok"
                ? "text-primary"
                : l.tone === "fail"
                  ? "text-destructive"
                  : "text-terminal-fg/85"
            }
          >
            <span className="text-muted-foreground mr-2">›</span>
            {l.text}
          </div>
        ))}
        {isValidating && (
          <div className="text-terminal-fg/70">
            <span className="text-muted-foreground mr-2">›</span>
            <span className="terminal-cursor" />
          </div>
        )}
      </div>
    </div>
  );
}
