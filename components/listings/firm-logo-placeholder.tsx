// Inline SVG placeholder for free-tier firms with no uploaded logo.
// Aspect ratio 4:3, dark navy background with lighter-blue gavel icon.
export function FirmLogoPlaceholder({ firmName }: { firmName: string }) {
  const displayName = firmName.length > 32 ? firmName.slice(0, 29) + "…" : firmName;

  return (
    <svg
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-label={`${firmName} placeholder logo`}
    >
      <rect width="400" height="300" fill="#1E3A5F" />

      {/* Gavel icon */}
      <g transform="translate(200, 105) rotate(-45)">
        <rect x="-6" y="-52" width="12" height="74" rx="3" fill="#3D87C0" />
        <rect x="-38" y="-11" width="76" height="20" rx="3" fill="#3D87C0" />
      </g>
      <rect x="162" y="178" width="76" height="12" rx="3" fill="#3D87C0" opacity="0.5" />

      {/* Firm name */}
      <text
        x="200"
        y="222"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="14"
        fontWeight="600"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      >
        {displayName}
      </text>

      {/* Claim CTA */}
      <text
        x="200"
        y="260"
        textAnchor="middle"
        fill="#F59E0B"
        fontSize="12"
        fontWeight="500"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      >
        Claim Your Profile →
      </text>
    </svg>
  );
}
