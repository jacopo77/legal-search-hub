"use client";

import { useRef, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { ImageOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShimmerImage } from "@/components/ui/shimmer-image";

// Shared visual image manager for a firm's logo/thumbnail — used by both
// LogoUploadForm (free tier) and PremiumEditForm's logo section, so both
// surfaces get the same current-image preview / replace / remove UX.
// Deliberately doesn't own any submit logic: the file input is wired to
// the parent's own react-hook-form `register("logo")`, so each form's
// existing commit flow (LogoUploadForm uploads immediately on its own
// button, PremiumEditForm bundles the file into its one big multipart
// submit) is untouched — this component only adds the preview/replace/
// remove chrome around it.
export function LogoImageManager({
  firmName,
  logoUrl,
  registerLogoInput,
  onCancelSelection,
  onRemove,
  removing,
}: {
  firmName: string;
  // Currently saved logo — parent-owned state, updated after a successful
  // upload or removal.
  logoUrl: string | null;
  registerLogoInput: UseFormRegisterReturn;
  // Parent clears its react-hook-form field value (e.g. resetField) so a
  // cancelled selection can't ride along on a later, unrelated submit.
  onCancelSelection: () => void;
  // Parent performs the DELETE call and updates its logoUrl state.
  onRemove: () => Promise<void> | void;
  removing: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // A successful upload or removal changes logoUrl — either way the
  // pending preview is stale (it either became the real image, or the
  // whole thing was cleared), so drop it. Adjusted during render (React's
  // documented "resetting state when a prop changes" pattern) rather than
  // in a useEffect, which would setState after an extra commit.
  const [prevLogoUrl, setPrevLogoUrl] = useState(logoUrl);
  if (logoUrl !== prevLogoUrl) {
    setPrevLogoUrl(logoUrl);
    setPreviewUrl(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    registerLogoInput.onChange(e);
    const file = e.target.files?.[0];
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function cancelPreview() {
    setPreviewUrl(null);
    onCancelSelection();
  }

  async function confirmRemove() {
    setConfirmingRemove(false);
    await onRemove();
  }

  return (
    <div className="flex items-start gap-4">
      <div className="relative h-[150px] w-[200px] shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30">
        {previewUrl ? (
          // Local blob: preview of a not-yet-uploaded file — next/image
          // can't optimize a client-only object URL, so a plain <img> here
          // is correct, not a missed ShimmerImage/next/image conversion.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="New logo preview"
            className="size-full object-contain p-2"
          />
        ) : logoUrl ? (
          <ShimmerImage
            src={logoUrl}
            alt={`${firmName} logo`}
            fill
            className="object-contain p-2"
            sizes="200px"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 text-center text-muted-foreground">
            <ImageOff className="size-6" aria-hidden />
            <span className="px-2 text-xs">No image uploaded yet</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-2">
        <input
          ref={(el) => {
            registerLogoInput.ref(el);
            inputRef.current = el;
          }}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          name={registerLogoInput.name}
          onBlur={registerLogoInput.onBlur}
          onChange={handleFileChange}
          className="hidden"
        />

        {previewUrl ? (
          <>
            <p className="text-xs text-muted-foreground">
              New image selected — not saved yet.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={cancelPreview}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-3.5" aria-hidden />
              {logoUrl ? "Replace Image" : "Upload Image"}
            </Button>

            {logoUrl && !confirmingRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmingRemove(true)}
              >
                Remove Image
              </Button>
            )}

            {confirmingRemove && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs">
                <p className="mb-1.5 font-medium text-destructive">
                  Remove this image?
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    disabled={removing}
                    onClick={confirmRemove}
                  >
                    {removing ? "Removing…" : "Yes, remove"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setConfirmingRemove(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground">
          JPEG, PNG, or WebP, under 2 MB.
        </p>
      </div>
    </div>
  );
}
