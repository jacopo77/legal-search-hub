// Simple Google Maps embed iframe — no npm package, no client JS.
// Uses the standard Google Maps "Share → Embed" URL format (no API key).
export function FirmMap({ address }: { address: string }) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-border">
      <iframe
        src={src}
        width="100%"
        height="300"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Firm location"
        className="block"
      />
    </div>
  );
}
