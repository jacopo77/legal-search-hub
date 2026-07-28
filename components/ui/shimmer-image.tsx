"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

// Wraps next/image with a pulsing skeleton overlay until the image
// finishes loading, instead of a bare gray box that pops abruptly once the
// lazy-loaded image arrives. onLoad requires a Client Component — Server
// Components can't hold the loaded state.
//
// The image itself is always rendered at full opacity from the start —
// next/image's onLoad is known not to fire for images the browser already
// has cached/decoded by mount time, so gating the image's own visibility
// on that event risks leaving it permanently invisible. Instead the pulse
// sits as an overlay on top (later in DOM order, same stacking context)
// and disappears once loaded fires; if it never fires, the only defect is
// a harmless lingering pulse over an already-visible image.
export function ShimmerImage({ className, alt, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <Image
        {...props}
        alt={alt}
        className={cn(className)}
        onLoad={() => setLoaded(true)}
      />
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" aria-hidden />
      )}
    </>
  );
}
