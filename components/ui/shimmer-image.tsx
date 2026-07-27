"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

// Wraps next/image with a pulsing skeleton behind it until the image
// finishes loading, instead of a bare gray box that pops abruptly once the
// lazy-loaded image arrives. onLoad requires a Client Component — Server
// Components can't hold the loaded state.
export function ShimmerImage({ className, alt, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" aria-hidden />
      )}
      <Image
        {...props}
        alt={alt}
        className={cn(
          className,
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}
