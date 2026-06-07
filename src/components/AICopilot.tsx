import { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bot, X, Send, Sparkles, AlertTriangle, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import * as THREE from "three";
import { useApp } from "@/lib/store";
import { dpr, geomDetail, isLowPower } from "@/lib/perf";
import { useInputFocusActive } from "@/hooks/use-input-focus-active";

type Msg = { role: "user" | "assistant"; content: string };

/* Animated icosahedron core for the orb */
function Core({ tone, paused }: { tone: "idle" | "ok" | "fail"; paused: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  useFrame(({ clock }) => {
    if (paused) return;
    if (!ref.current) return;
    ref.current.rotation.x = clock.elapsedTime * 0.6;
    ref.current.rotation.y = clock.elapsedTime * 0.4;
    invalidate();
  });
  const color = tone === "ok" ? "#5cffaa" : tone === "fail" ? "#ff4f6a" : "#7dd3fc";
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 2, 2]} intensity={1.4} color={color} />
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.85, geomDetail(1)]} />
        <meshStandardMaterial color={color} wireframe emissive={color} emissiveIntensity={0.8} />
      </mesh>
    </>
  );
}

const MessageBubble = memo(function MessageBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm ${
        role === "user"
          ? "ml-8 bg-primary/10 border border-primary/20 text-foreground"
          : "mr-4 bg-surface-2/70 border border-border text-foreground"
      }`}
    >
      <div className="prose prose-sm prose-invert max-w-none [&_*]:!my-1 [&_code]:font-mono [&_code]:text-primary">
        <ReactMarkdown>{content || "…"}</ReactMarkdown>
      </div>
    </div>
  );
});

const ChatComposer = memo(function ChatComposer({
  busy,
  onSend,
}: {
  busy: boolean;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const text = input.trim();
        if (text && !busy) {
          setInput("");
          onSend(text);
        }
      }}
      className="flex items-center gap-2"
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask the oracle…"
        className="flex-1 bg-input/60 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        disabled={busy || !input.trim()}
        className="rounded-md bg-primary text-primary-foreground px-3 py-2 disabled:opacity-50"
      >
        <Send className="size-4" />
      </button>
    </form>
  );
});

export function AICopilot() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "I'm the **SpatioTrust Oracle Assistant**. Drop a point cloud or load a scenario and I'll walk you through what the validators see. Ask me anything.",
    },
  ]);
  const result = useApp((s) => s.result);
  const isValidating = useApp((s) => s.isValidating);
  const autoNarrate = useApp((s) => s.autoNarrate);
  const inputFocusActive = useInputFocusActive();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android.*Mobile|iPhone|iPod|Mobi/i.test(navigator.userAgent);
  // Hide the orb's WebGL context while the panel is open on mobile —
  // it's behind the chat sheet anyway and the freed GPU memory keeps
  // the on-screen keyboard from crashing the tab on iOS Safari (Vercel SPA).
  const showOrbCanvas = !(isMobile && open);

  const tone: "idle" | "ok" | "fail" =
    result?.status === "pass" ? "ok" : result?.status === "fail" ? "fail" : "idle";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Auto-narrate on new result
  const lastNarratedHash = useRef<string | null>(null);
  useEffect(() => {
    if (!autoNarrate || isValidating || !result) return;
    if (lastNarratedHash.current === result.zk_mock_hash) return;
    lastNarratedHash.current = result.zk_mock_hash;
    void send(
      result.status === "pass"
        ? "Summarize this verified attestation in 2 short sentences."
        : "In 2 short sentences, explain why this spatial structure failed integrity.",
      /*hidden*/ true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, isValidating, autoNarrate]);

  async function send(text: string, hidden = false, mode?: "explainer" | "fix") {
    const userMsg: Msg = { role: "user", content: text };
    const next: Msg[] = hidden ? messages : [...messages, userMsg];
    if (!hidden) setMessages(next);
    setBusy(true);
    let acc = "";
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: hidden ? [...messages, userMsg] : next,
          context: result ?? null,
          mode,
        }),
      });
      if (!r.ok || !r.body) {
        const e = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
        setMessages((m) => [...m, { role: "assistant", content: `⚠ ${e.error ?? "AI error"}` }]);
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let done = false;
      // push a placeholder assistant message
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(payload);
            const delta = (parsed.delta ?? parsed.choices?.[0]?.delta?.content) as
              | string
              | undefined;
            if (parsed.error) {
              setMessages((m) => {
                const c = [...m];
                c[c.length - 1] = { role: "assistant", content: `⚠ ${parsed.error}` };
                return c;
              });
              continue;
            }
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const c = [...m];
                c[c.length - 1] = { role: "assistant", content: acc };
                return c;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠ ${e?.message ?? "network error"}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating orb */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-40 size-16 rounded-full border border-primary/30 bg-surface/80 backdrop-blur-xl shadow-[0_0_40px_-12px_var(--primary-glow)] overflow-hidden"
        title="SpatioTrust AI co-pilot"
      >
        {showOrbCanvas ? (
          <Canvas
            camera={{ position: [0, 0, 2.4], fov: 45 }}
            dpr={dpr()}
            frameloop="demand"
            gl={{ antialias: !isLowPower, powerPreference: "high-performance", alpha: true }}
          >
            <Core tone={tone} paused={inputFocusActive} />
          </Canvas>
        ) : (
          <div className="size-full grid place-items-center">
            <Bot className="size-6 text-primary" />
          </div>
        )}
        <span className="absolute -top-1 -right-1 size-3 rounded-full bg-primary animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed bottom-24 right-5 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/70">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-primary" />
                <span className="font-display font-semibold text-sm">Oracle Assistant</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  ai mesh · streaming
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <MessageBubble key={i} role={m.role} content={m.content} />
              ))}
            </div>
            <div className="border-t border-border p-3 bg-surface/60">
              {/* Context-aware action chips */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="flex gap-2 mb-2 flex-wrap"
                  >
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() =>
                        send(
                          "Explain the anomaly in this validation: identify which heuristic (base support, centroid alignment, floating mass) triggered and why. Use 3 short bullets.",
                          false,
                          "explainer",
                        )
                      }
                      disabled={busy}
                      className="text-[11px] px-2 py-1 rounded-full border border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <AlertTriangle className="size-3" /> Explain anomaly
                    </motion.button>
                    {result.status === "fail" && (
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() =>
                          send(
                            "Recommend 3 concrete spatial corrections (recenter mass, expand base footprint, remove floating slice) that would flip this from fail to pass. Reference specific metrics.",
                            false,
                            "fix",
                          )
                        }
                        disabled={busy}
                        className="text-[11px] px-2 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <Wrench className="size-3" /> Suggest a fix
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex gap-2 mb-2 flex-wrap">
                {[
                  "Explain this result",
                  "What is a zk attestation?",
                  "Walk me through the demo",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={busy}
                    className="text-[11px] px-2 py-1 rounded-full border border-border bg-surface hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="size-3 inline mr-1 text-primary" />
                    {q}
                  </button>
                ))}
              </div>
              <ChatComposer busy={busy} onSend={(text) => void send(text)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
