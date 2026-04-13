import { useRef, useEffect, useState, useCallback } from "react";
import { animate } from "framer-motion";

interface AnimatedCounterProps {
  target: number;
  prefix?: string;
  suffix?: string;
}

export default function AnimatedCounter({ target, prefix = "", suffix = "" }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  const ref = useCallback(
    (node: HTMLSpanElement | null) => {
      if (!node || hasAnimated.current) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            observer.disconnect();
            const controls = animate(0, target, {
              duration: 1.5,
              ease: "easeOut",
              onUpdate: (v) => setDisplay(Math.round(v)),
            });
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(node);
    },
    [target]
  );

  return (
    <span ref={ref}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}
