import { useEffect, useRef } from "react";

export interface Keys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
}

export function useKeyboard() {
  const keys = useRef<Keys>({
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
  });

  useEffect(() => {
    const keyMap: Record<string, keyof Keys> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        keys.current.jump = true;
        return;
      }
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        keys.current[dir] = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        keys.current.jump = false;
        return;
      }
      const dir = keyMap[e.key];
      if (dir) keys.current[dir] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return keys;
}
