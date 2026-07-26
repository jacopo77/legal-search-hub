// Google Maps Embed API v1 iframe — no npm package, no client JS.
// Falls back to the standard share-embed URL if the API key is unset.
import { env } from "@/lib/env";

export function FirmMap({ address }: { address: string }) {
  const apiKey = env.googleMaps.embedApiKey();
  const encoded = encodeURIComponent(address);
  const src = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encoded}`
    : `https://maps.google.com/maps?q=${encoded}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

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
