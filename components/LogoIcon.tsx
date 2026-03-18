"use client";

/**
 * LogoIcon — Portal RH: shield + 3 people silhouettes.
 * variant="white"  → white figures on blue background  (sidebar, login header)
 * variant="color"  → blue figures on light background  (white/light backgrounds)
 *
 * The background is embedded in the SVG itself so it never
 * depends on a Tailwind utility class to show the blue square.
 */
type Props = { size?: number; variant?: "white" | "color" };

export default function LogoIcon({ size = 32, variant = "color" }: Props) {
  const onBlue = variant === "white";

  // Background fill inside the SVG rounded rect
  const bgFill     = onBlue ? "#1d4ed8" : "#eff6ff";
  // Shield stroke / outline
  const shieldLine = onBlue ? "rgba(255,255,255,0.85)" : "#2563eb";
  const shieldFill = onBlue ? "rgba(255,255,255,0.12)" : "rgba(219,234,254,0.5)";
  // Center (front) person
  const fgMain     = onBlue ? "#ffffff" : "#2563eb";
  // Side people
  const fgSide     = onBlue ? "rgba(255,255,255,0.68)" : "#93c5fd";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Blue rounded-square background ── */}
      <rect width="32" height="32" rx="8" fill={bgFill} />

      {/* ── Shield ── */}
      <path
        d="M16 4 L6 7.5 L6 14 C6 19.5 10 23.5 16 25 C22 23.5 26 19.5 26 14 L26 7.5 Z"
        fill={shieldFill}
        stroke={shieldLine}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* ── Left side person ── */}
      <circle cx="10" cy="14.5" r="2.2" fill={fgSide} />
      <path
        d="M5 23 Q10 18.5 15 23"
        stroke={fgSide}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* ── Right side person ── */}
      <circle cx="22" cy="14.5" r="2.2" fill={fgSide} />
      <path
        d="M17 23 Q22 18.5 27 23"
        stroke={fgSide}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* ── Center (front) person — larger, brighter ── */}
      <circle cx="16" cy="12.5" r="3" fill={fgMain} />
      <path
        d="M9 24 Q16 19 23 24"
        stroke={fgMain}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
