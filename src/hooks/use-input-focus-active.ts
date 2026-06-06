import { useEffect, useState } from "react";

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

export function useInputFocusActive(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const update = () => setActive(isTextEntryElement(document.activeElement));
    const updateAfterFocusSettles = () => requestAnimationFrame(update);

    update();
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", updateAfterFocusSettles);

    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", updateAfterFocusSettles);
    };
  }, []);

  return active;
}