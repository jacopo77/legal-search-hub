import { env } from "@/lib/env";

// HighLevel (GoHighLevel) client wrapper (T15). The ONLY place this app's
// code talks to HighLevel — all four triggers (new signup, checkout
// completed, contact-form lead, claim/edit request) go through these
// functions (CLAUDE.md rule 6).
//
// SERVER-ONLY: uses the secret API key. Never import from a Client
// Component.
//
// Every function returns a result object instead of throwing: HighLevel
// sync is best-effort (CLAUDE.md rule 7) — the local Postgres row is the
// source of truth, and callers update their own sync-status field. A
// failed HighLevel call must never fail the user-facing action.

const BASE_URL = "https://services.leadconnectorhq.com";
// HighLevel API v2 requires this version header on every request.
const API_VERSION = "2021-07-28";

export type HighLevelResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

async function request<T>(
  method: "POST" | "PUT",
  path: string,
  body: Record<string, unknown>,
): Promise<HighLevelResult<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.highlevel.apiKey()}`,
        Version: API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: await res.text() };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export type HighLevelContact = { id: string };

// New-signup + contact-form-lead triggers: upsert by email so repeat
// submissions update the same HighLevel contact instead of duplicating.
export async function createOrUpdateContact(input: {
  name: string;
  email: string;
  phone?: string;
  tags?: string[];
}): Promise<HighLevelResult<HighLevelContact>> {
  const result = await request<{ contact: HighLevelContact }>(
    "POST",
    "/contacts/upsert",
    {
      locationId: env.highlevel.locationId(),
      name: input.name,
      email: input.email,
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.tags?.length ? { tags: input.tags } : {}),
    },
  );
  if (!result.ok) return result;
  // Validate the shape instead of casting blind: a 2xx without the expected
  // wrapper would otherwise throw TypeError at the call site — which in the
  // Stripe webhook becomes a 500 and a retry loop.
  if (!result.data.contact?.id) {
    return { ok: false, status: 200, error: "HighLevel returned no contact id" };
  }
  return { ok: true, data: result.data.contact };
}

// Checkout-completed trigger: the core revenue event — moves the firm's
// contact through the nurture pipeline. pipelineId/stageId come from the
// HighLevel pipeline settings (set them as pipeline stages are defined;
// until then HighLevel uses the default stage).
export async function createOpportunity(input: {
  contactId: string;
  name: string;
  pipelineId?: string;
  stageId?: string;
}): Promise<HighLevelResult<{ id: string }>> {
  const result = await request<{ opportunity: { id: string } }>(
    "POST",
    "/opportunities/",
    {
      locationId: env.highlevel.locationId(),
      contactId: input.contactId,
      name: input.name,
      ...(input.pipelineId ? { pipelineId: input.pipelineId } : {}),
      ...(input.stageId ? { pipelineStageId: input.stageId } : {}),
    },
  );
  if (!result.ok) return result;
  if (!result.data.opportunity?.id) {
    return {
      ok: false,
      status: 200,
      error: "HighLevel returned no opportunity id",
    };
  }
  return { ok: true, data: result.data.opportunity };
}

// Claim/edit-request trigger: a tracked follow-up item for an admin on the
// firm's HighLevel contact.
export async function createTask(input: {
  contactId: string;
  title: string;
  body?: string;
  dueDate?: string; // ISO 8601
}): Promise<HighLevelResult<{ id: string }>> {
  const result = await request<{ task: { id: string } }>(
    "POST",
    `/contacts/${encodeURIComponent(input.contactId)}/tasks`,
    {
      title: input.title,
      ...(input.body ? { body: input.body } : {}),
      ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    },
  );
  if (!result.ok) return result;
  if (!result.data.task?.id) {
    return { ok: false, status: 200, error: "HighLevel returned no task id" };
  }
  return { ok: true, data: result.data.task };
}
