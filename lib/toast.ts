import { Toast } from "@base-ui/react/toast";

// Module-level singleton so any client component can fire a toast via a
// plain import — no provider/context plumbing needed at each call site.
// Rendered by components/ui/toaster.tsx, mounted once in app/layout.tsx.
// createToastManager only exists on the Toast namespace export, not as a
// top-level named export (@base-ui/react/toast re-exports it type-only).
export const toastManager = Toast.createToastManager();

export function notifySuccess(description: string, title?: string) {
  toastManager.add({ type: "success", title, description });
}

export function notifyError(description: string, title?: string) {
  toastManager.add({ type: "error", title, description });
}
