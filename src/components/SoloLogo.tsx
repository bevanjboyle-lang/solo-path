interface SoloLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function SoloLogo({ width = 140, height = 40, className }: SoloLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 168 48"
      width={width}
      height={height}
      role="img"
      aria-label="Solo"
      className={className}
    >
      {/* Ring 2 - outer, very faint */}
      <circle cx="29.12" cy="17.00" r="1.3" fill="#2ECDB0" opacity="0.25"/>
      <circle cx="17.00" cy="10.00" r="1.3" fill="#2ECDB0" opacity="0.25"/>
      <circle cx="4.88"  cy="17.00" r="1.3" fill="#2ECDB0" opacity="0.25"/>
      <circle cx="4.88"  cy="31.00" r="1.3" fill="#2ECDB0" opacity="0.25"/>
      <circle cx="17.00" cy="38.00" r="1.3" fill="#2ECDB0" opacity="0.25"/>
      <circle cx="29.12" cy="31.00" r="1.3" fill="#2ECDB0" opacity="0.25"/>

      {/* Ring 1 - inner halo */}
      <circle cx="25.50" cy="24.00" r="2.0" fill="#2ECDB0" opacity="0.55"/>
      <circle cx="21.25" cy="16.64" r="2.0" fill="#2ECDB0" opacity="0.55"/>
      <circle cx="12.75" cy="16.64" r="2.0" fill="#2ECDB0" opacity="0.55"/>
      <circle cx="8.50"  cy="24.00" r="2.0" fill="#2ECDB0" opacity="0.55"/>
      <circle cx="12.75" cy="31.36" r="2.0" fill="#2ECDB0" opacity="0.55"/>
      <circle cx="21.25" cy="31.36" r="2.0" fill="#2ECDB0" opacity="0.55"/>

      {/* Centre dot */}
      <circle cx="17.00" cy="24.00" r="4.0" fill="#2ECDB0"/>

      {/* Wordmark */}
      <text x="36" y="37" fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" fontSize="34" fontWeight="600" letterSpacing="-1" fill="currentColor">solo</text>
    </svg>
  );
}
