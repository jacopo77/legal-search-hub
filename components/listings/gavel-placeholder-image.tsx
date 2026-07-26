// Dark navy placeholder image with gavel icon only (no text).
// Designed to fill its container using slice scaling.
export function GavelPlaceholderImage() {
  return (
    <svg
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="300" fill="#1E3A5F" />

      {/* Gavel icon — centered in the frame */}
      <svg x="160" y="110" width="80" height="80" viewBox="0 0 24 24">
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
    </svg>
  );
}
