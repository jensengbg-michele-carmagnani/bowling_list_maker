import { useEffect } from "react";

export function useDebouncedEffect(effect: () => void, deps: unknown[], delay = 450) {
  useEffect(() => {
    const timer = window.setTimeout(effect, delay);
    return () => window.clearTimeout(timer);
  }, deps);
}
