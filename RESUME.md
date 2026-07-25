# Resume notes

Last updated: 2026-07-25

## Daily startup prompt

Paste this into the K3 session right after launching `claude` in this
repo:

> Read CLAUDE.md and docs/TASKS.md, pick up from the next
> incomplete task, and tell me where we are before starting
> anything new. Also check the last git commit message to
> confirm what was most recently completed.

## Where things stand

- Last commit on `main` (in sync with `origin/main`): `6afc0e1` — **T15:
  HighLevel client wrapper**.
- **Uncommitted in the working tree:**
  - **T16 — Admin moderation queue**, fully built and verified:
    - `app/admin/page.tsx` (thin wrapper)
    - `components/admin/moderation-queue.tsx` (role-gated on
      `profiles.role = 'admin'`; lists pending firms with approve/reject,
      open `firm_change_requests` with a resolve action)
    - `lib/admin/require-admin.ts` (shared admin check, cookie-session
      client so `is_admin()` bypass on RLS/guard triggers applies)
    - `app/api/admin/firms/[id]/route.ts` (approve → `status = live`,
      reject → `status = rejected`)
    - `app/api/admin/change-requests/[id]/route.ts` (resolve →
      `status = resolved`)
    - Verified: `tsc --noEmit` clean, `eslint` clean, `prettier` clean,
      and a real dev-server check confirming `/admin` 404s for a
      signed-out visitor.
  - **`.gitignore` fix**: added `.claude/settings.local.json` so the
    Moonshot/Kimi K3 API token (in that file) can't get committed. The
    file itself was also renamed from `.claude/settings.json` →
    `.claude/settings.local.json` to follow Claude Code's own
    local-secrets convention.
- **Not yet decided:** whether to commit T16 + the gitignore fix as-is,
  or keep iterating uncommitted first.

## Next task

Per `docs/TASKS.md` dependency order, once T16 is committed the next
task is **T17 — Claim / edit-request intake**: a lightweight form on the
unclaimed-firm detail page (T12) → `POST /api/listings/[id]/claim` →
inserts `firm_change_requests` → fires the HighLevel claim/edit trigger.
No automated ownership verification — admin resolves manually via T16.
Depends on T12, T15, T16 (all satisfied once T16 lands).

## Model / session note

This project runs Claude Code on Kimi K3 (Moonshot AI) via
`.claude/settings.local.json` in this repo root — that file has the live
`ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN`/`ANTHROPIC_MODEL` env vars.
It only takes effect for a Claude Code session launched with cwd inside
this repo. Read `CLAUDE.md` and `docs/TASKS.md` first in any new session
before starting work — they're the rulebook and task list this project
follows.
