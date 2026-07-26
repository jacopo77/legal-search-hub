// Inline SVG placeholder for free-tier firms with no uploaded logo.
// Aspect ratio 4:3, dark navy background with pre-built gavel icon.

function wrapName(name: string): string[] {
  const MAX_PER_LINE = 22;
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

export function FirmLogoPlaceholder({
  firmName,
  practiceArea,
}: {
  firmName: string;
  practiceArea?: string;
}) {
  const displayName = firmName.length > 46 ? firmName.slice(0, 43) + "…" : firmName;
  const lines = wrapName(displayName);

  return (
    <svg
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-label={`${firmName} placeholder logo`}
    >
      <rect width="400" height="300" fill="#1E3A5F" />

      {/* Pre-built gavel icon — 80×80, centered in upper portion */}
      <svg x="160" y="30" width="80" height="80" viewBox="0 0 24 24">
        <path
          d="M9 3L6 6L10 10L13 7L9 3Z"
          fill="#3D87C0"
          stroke="#3D87C0"
          strokeWidth="1"
        />
        <path
          d="M13 7L10 10L14 14L17 11L13 7Z"
          fill="#5B9FD4"
          stroke="#5B9FD4"
          strokeWidth="1"
        />
        <path
          d="M5 19L10 14"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M3 21H9"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Firm name — bold, white, 26px, centered, two-line max */}
      <g
        fontSize="26"
        fontWeight="bold"
        fill="#FFFFFF"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      >
        {lines.map((line, i) => (
          <text key={i} x="200" y={145 + i * 34}>
            {line}
          </text>
        ))}
      </g>

      {practiceArea && (
        <text
          x="200"
          y={145 + (lines.length - 1) * 34 + 28}
          textAnchor="middle"
          fill="#D1D5DB"
          fontSize="18"
          fontStyle="italic"
          fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        >
          {practiceArea}
        </text>
      )}
    </svg>
  );
}
