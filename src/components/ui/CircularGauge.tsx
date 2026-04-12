import { useRef, useEffect, useState } from "react";
import { useInView, animate } from "framer-motion";

interface CircularGaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export default function CircularGauge({ value, size = 120, strokeWidth = 8, color = "#2ECDB0" }: CircularGaugeProps) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [progress, setProgress] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (v) => setProgress(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--surface-inset))"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-bold"
        style={{ fontSize: size * 0.22 }}
      >
        {Math.round(progress)}
      </text>
    </svg>
  );
}
