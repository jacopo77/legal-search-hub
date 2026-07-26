// Placeholder card for an available premium/featured slot.
// All text and the CTA live inside the dark navy SVG image; the white
// area below is intentionally empty for visual contrast.
export function PremiumPlaceholderCard() {
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Dark navy image area — everything lives inside this SVG */}
      <div className="relative aspect-[4/3] w-full">
        <svg
          viewBox="0 0 400 300"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <rect width="400" height="300" fill="#1E3A5F" />

          {/* FEATURED badge */}
          <rect
            x="282"
            y="12"
            width="108"
            height="26"
            rx="13"
            fill="#F59E0B"
          />
          <text
            x="336"
            y="30"
            textAnchor="middle"
            fill="#1E3A5F"
            fontSize="12"
            fontWeight="bold"
            fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          >
            FEATURED
          </text>

          {/* Gavel icon */}
          <svg x="160" y="40" width="80" height="80" viewBox="0 0 24 24">
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

          {/* Title — white, bold, 22px */}
          <text
            x="200"
            y="150"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="22"
            fontWeight="bold"
            fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          >
            Premium Listing Available
          </text>

          {/* Subtitle — gold, italic, 16px */}
          <text
            x="200"
            y="180"
            textAnchor="middle"
            fill="#F59E0B"
            fontSize="16"
            style={{ fontStyle: "italic" }}
            fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          >
            Get your firm featured here
          </text>

          {/* Outlined gold button */}
          <a href="/list-your-firm">
            <rect
              x="100"
              y="225"
              width="200"
              height="40"
              rx="8"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
            />
            <text
              x="200"
              y="250"
              textAnchor="middle"
              fill="#F59E0B"
              fontSize="14"
              fontWeight="600"
              fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            >
              Claim This Spot →
            </text>
          </a>
        </svg>
      </div>

      {/* Empty white area below the image */}
      <div className="flex-1 p-6" />
    </li>
  );
}
