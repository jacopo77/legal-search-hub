import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

// Wraps next/image with an animated shimmer sweep behind it, instead of a
// bare gray box that pops abruptly once the lazy-loaded image arrives. A
// directional gradient sweep (.shimmer-sweep, globals.css) reads clearly as
// "loading" — an earlier flat animate-pulse box was too subtle against its
// own gray-100 card background and read as a broken image, not a loading one.
//
// Deliberately has NO onLoad/loaded-state logic: next/image's onLoad does
// not reliably fire in this app (verified empirically — images that load
// successfully, confirmed via LCP and network logs, never triggered it),
// so any approach that depends on that event to reveal or hide the image
// risks getting stuck. Instead the shimmer sits behind the image in plain
// DOM/stacking order (rendered first, image second, both absolute-fill) —
// once the image paints, its opaque pixels simply cover the shimmer
// underneath with no JS involved. If the image is still loading or fails,
// the shimmer remains visible through the gap. This is a Server Component;
// no client state is needed.
export function ShimmerImage({ className, alt, ...props }: ImageProps) {
  return (
    <>
      <div className="shimmer-sweep absolute inset-0" aria-hidden />
      <Image {...props} alt={alt} className={cn(className)} />
    </>
  );
}
