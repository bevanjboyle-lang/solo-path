interface ShimmerSkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export default function ShimmerSkeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  className,
}: ShimmerSkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, hsl(var(--surface-inset)) 25%, hsl(var(--surface-card)) 50%, hsl(var(--surface-inset)) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer-sweep 1.5s ease-in-out infinite",
      }}
    />
  );
}
