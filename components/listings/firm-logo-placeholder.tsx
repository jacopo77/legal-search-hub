// Inline SVG placeholder for free-tier firms with no uploaded logo.
// Aspect ratio 4:3, dark navy background with detailed gavel icon.

function wrapName(name: string): string[] {
  const MAX_PER_LINE = 20;
  if (name.length <= MAX_PER_LINE) return [name];

  const mid = Math.floor(name.length / 2);
  let splitAt = name.lastIndexOf(" ", mid + 3);
  if (splitAt <= 0 || splitAt < mid - 5) {
    splitAt = name.indexOf(" ", mid);
  }
  if (splitAt <= 0 || splitAt > MAX_PER_LINE * 2) {
    return [name.slice(0, MAX_PER_LINE - 1) + "…"];
  }

  const first = name.slice(0, splitAt).trim();
  const rest = name.slice(splitAt + 1).trim();

  if (rest.length > MAX_PER_LINE) {
    return [first, rest.slice(0, MAX_PER_LINE - 1) + "…"];
  }
  return [first, rest];
}

export function FirmLogoPlaceholder({ firmName }: { firmName: string }) {
  const displayName = firmName.length > 42 ? firmName.slice(0, 39) + "…" : firmName;
  const lines = wrapName(displayName);

  return (
    <svg
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-label={`${firmName} placeholder logo`}
    >
      <rect width="400" height="300" fill="#1E3A5F" />

      {/* Gavel icon group — handle (white), head (blue), rotated ~45° */}
      <g transform="translate(200, 82) rotate(-45)">
        {/* Handle */}
        <rect
          x="-7"
          y="-50"
          width="14"
          height="100"
          rx="7"
          fill="#FFFFFF"
        />
        {/* Mallet head */}
        <rect
          x="-42"
          y="-66"
          width="84"
          height="30"
          rx="8"
          fill="#3D87C0"
        />
        {/* Head highlight */}
        <rect
          x="-38"
          y="-64"
          width="76"
          height="4"
          rx="2"
          fill="#5BA3D4"
          opacity="0.5"
        />
      </g>

      {/* Sound block / base beneath the gavel */}
      <rect
        x="150"
        y="150"
        width="100"
        height="14"
        rx="5"
        fill="#F59E0B"
      />

      {/* Firm name — large, bold, white, centered, two-line max */}
      <g
        fontSize="28"
        fontWeight="bold"
        fill="#FFFFFF"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      >
        {lines.map((line, i) => (
          <text key={i} x="200" y={182 + i * 34}>
            {line}
          </text>
        ))}
      </g>

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
