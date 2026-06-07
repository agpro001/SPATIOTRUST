import { createContext, useContext, useEffect, useMemo, useState, type ReactNode, createElement } from "react";

function isTextEntryElement(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLInputElement) {
    const nonTextTypes = new Set(["button", "checkbox", "color", "file", "hidden", "radio", "range", "reset", "submit"]);
    return !nonTextTypes.has(element.type);
  }
  return (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element.getAttribute("contenteditable") === "true" ||
    element.getAttribute("role") === "textbox"
  );
}

type InputFocusValue = { active: boolean; isMobile: boolean };

const InputFocusContext = createContext<InputFocusValue | null>(null);

function detectMobile(): boolean {
  if (typeof window === "undefined") return false;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const uaMobile = /Android.*Mobile|iPhone|iPod|Mobi/i.test(ua);
  const mq = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 768px)").matches;
  return uaMobile || mq;
}

export function InputFocusProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => detectMobile());

  useEffect(() => {
    const update = () => setActive(isTextEntryElement(document.activeElement));
    const updateAfterFocusSettles = () => requestAnimationFrame(update);

    update();
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", updateAfterFocusSettles);

    const onResize = () => setIsMobile(detectMobile());
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", updateAfterFocusSettles);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const value = useMemo<InputFocusValue>(() => ({ active, isMobile }), [active, isMobile]);
  return createElement(InputFocusContext.Provider, { value }, children);
}

export function useInputFocus(): InputFocusValue {
  const ctx = useContext(InputFocusContext);
  if (ctx) return ctx;
  // Fallback for trees rendered outside the provider (e.g. SSR shell): treat as inactive desktop.
  return { active: false, isMobile: false };
}

// Backwards-compatible boolean hook used by existing components.
export function useInputFocusActive(): boolean {
  return useInputFocus().active;
}