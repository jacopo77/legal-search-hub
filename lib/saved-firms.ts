import { useCallback, useEffect, useSyncExternalStore } from "react";
import { notifyError } from "@/lib/toast";

const STORAGE_KEY = "lsh:savedFirms";

type State = {
  ids: Set<string>;
  // null until ensureLoaded() resolves once — true means the DB is the
  // source of truth (signed in), false means localStorage is (signed out
  // or the /api/saved-firms check failed open to the safer no-account
  // assumption).
  signedIn: boolean | null;
  loaded: boolean;
};

// Module-level singleton (mirrors lib/toast.ts's toastManager) so every
// SaveButton/useSavedFirm* call site shares one fetched-once list instead of
// each card independently hitting /api/saved-firms. Only ever mutated from
// a useEffect or an event handler (both client-only), never during render —
// so although this module is also require()'d on the server for typechecking/
// bundling, `state` is never touched server-side and getServerSnapshot below
// always returns a fixed neutral value, so there's no cross-request leakage.
let state: State = { ids: new Set(), signedIn: null, loaded: false };
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function readLocalStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeLocalStorage(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage full/disabled (private browsing) — the in-memory state still
    // works for the rest of this session, it just won't persist.
  }
}

let loadPromise: Promise<void> | null = null;

// Signed-in users' saves live in saved_firms; signed-out visitors get a
// localStorage-only list. No merge between the two on sign-in in v1 —
// whichever applies right now is the only list read.
function ensureLoaded(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch("/api/saved-firms");
      if (res.ok) {
        const { firmIds } = (await res.json()) as { firmIds: string[] };
        state = { ids: new Set(firmIds), signedIn: true, loaded: true };
      } else {
        state = { ids: readLocalStorage(), signedIn: false, loaded: true };
      }
    } catch {
      state = { ids: readLocalStorage(), signedIn: false, loaded: true };
    }
    notify();
  })();
  return loadPromise;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): State {
  return state;
}

function getServerSnapshot(): State {
  return { ids: new Set(), signedIn: null, loaded: false };
}

async function toggle(firmId: string) {
  const wasSaved = state.ids.has(firmId);
  const nowSaved = !wasSaved;
  const optimistic = new Set(state.ids);
  if (nowSaved) optimistic.add(firmId);
  else optimistic.delete(firmId);
  state = { ...state, ids: optimistic };
  notify();

  if (state.signedIn) {
    try {
      const res = await fetch("/api/saved-firms", {
        method: nowSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmId }),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      const reverted = new Set(state.ids);
      if (nowSaved) reverted.delete(firmId);
      else reverted.add(firmId);
      state = { ...state, ids: reverted };
      notify();
      notifyError("Could not save — please try again.");
    }
  } else {
    writeLocalStorage(optimistic);
  }
}

// Per-card hook: whether firmId is saved, plus a toggle function.
export function useSavedFirm(firmId: string) {
  useEffect(() => {
    ensureLoaded();
  }, []);
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const handleToggle = useCallback(() => {
    toggle(firmId);
  }, [firmId]);
  return { saved: snapshot.ids.has(firmId), toggle: handleToggle };
}

// Whole-list hook: the /saved page's signed-out (localStorage) branch needs
// the full id set to resolve against /api/firms/lookup.
export function useSavedFirmIds() {
  useEffect(() => {
    ensureLoaded();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
