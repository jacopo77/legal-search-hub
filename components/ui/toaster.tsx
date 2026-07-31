"use client";

import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";
import { toastManager } from "@/lib/toast";
import { cn } from "@/lib/utils";

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={cn(
        "absolute inset-x-0 mx-auto w-full rounded-xl border p-4 shadow-lg transition-all",
        "data-[swipe-direction]:transition-none",
        "translate-y-(--toast-swipe-movement-y) data-[transition-status=starting]:translate-y-4 data-[transition-status=starting]:opacity-0 data-[transition-status=ending]:opacity-0",
        toast.type === "error"
          ? "border-destructive/30 bg-destructive/5"
          : "border-primary/30 bg-card",
      )}
      style={{
        bottom: "calc(var(--toast-offset-y) * -1)",
        zIndex: "calc(1000 - var(--toast-index))",
        scale: "calc(1 - var(--toast-index) * 0.05)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {toast.title && (
            <Toast.Title className="text-sm font-semibold" />
          )}
          <Toast.Description className="mt-0.5 text-sm text-muted-foreground" />
        </div>
        <Toast.Close
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </Toast.Close>
      </div>
    </Toast.Root>
  ));
}

// Mounted once in app/layout.tsx. Uses the module-level toastManager from
// lib/toast.ts so components/firms/*-form.tsx etc. can fire a toast with a
// plain import instead of needing to be inside a specific provider tree.
export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager}>
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
