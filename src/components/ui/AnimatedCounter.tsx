import { useRef, useEffect, useState } from "react";
import { useInView, animate } from "framer-motion";

interface AnimatedCounterProps {
  target: number;
  prefix?: string;
  suffix?: string;
}

export default function AnimatedCounter({ target, prefix = "", suffix = "" }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, target]);

  return (
    <span ref={ref}>
      {prefix}{display}{suffix}
    </span>
  );
}
