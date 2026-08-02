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
  try {
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
    // Validate the shape instead of casting blind: a 2xx without the
    // expected wrapper would otherwise throw TypeError at the call site —
    // which in the Stripe webhook becomes a 500 and a retry loop.
    if (!result.data.contact?.id) {
      return { ok: false, status: 200, error: "HighLevel returned no contact id" };
    }
    return { ok: true, data: result.data.contact };
  } catch (err) {
    // env.highlevel.locationId()/apiKey() throw on missing config — that
    // read happens here, before request()'s own try/catch, so it must be
    // caught at this level too or a misconfigured env crashes the caller
    // (e.g. the whole "List Your Firm" signup) instead of just logging.
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Checkout-completed trigger: the core revenue event — moves the firm's
// contact through the nurture pipeline. pipelineId/stageId are both
// effectively required — HighLevel's API rejects opportunity creation
// without a pipelineId (COMMON_PIPELINE_ID_UNDEFINED), so callers must pass
// them (see env.highlevel.opportunityPipelineId()/opportunityPremiumStageId()).
export async function createOpportunity(input: {
  contactId: string;
  name: string;
  pipelineId?: string;
  stageId?: string;
}): Promise<HighLevelResult<{ id: string }>> {
  try {
    const result = await request<{ opportunity: { id: string } }>(
      "POST",
      "/opportunities/",
      {
        locationId: env.highlevel.locationId(),
        contactId: input.contactId,
        name: input.name,
        // HighLevel requires status on every opportunity — "open" is
        // correct for one freshly created off a checkout-completed event.
        status: "open",
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
  } catch (err) {
    // See createOrUpdateContact: env.highlevel.locationId() throws on
    // missing config, before request()'s own try/catch runs.
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Follow-up window for a task with no caller-supplied due date — HighLevel
// requires `dueDate` on every task (as of a 2026 API tightening), so this
// admin-created follow-up gets a default rather than leaving it caller-only.
const DEFAULT_TASK_DUE_DAYS = 3;

// Claim/edit-request trigger: a tracked follow-up item for an admin on the
// firm's HighLevel contact.
export async function createTask(input: {
  contactId: string;
  title: string;
  body?: string;
  dueDate?: string; // ISO 8601
}): Promise<HighLevelResult<{ id: string }>> {
  const dueDate =
    input.dueDate ??
    new Date(
      Date.now() + DEFAULT_TASK_DUE_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
  const result = await request<{ task: { id: string } }>(
    "POST",
    `/contacts/${encodeURIComponent(input.contactId)}/tasks`,
    {
      title: input.title,
      ...(input.body ? { body: input.body } : {}),
      dueDate,
      completed: false,
    },
  );
  if (!result.ok) return result;
  if (!result.data.task?.id) {
    return { ok: false, status: 200, error: "HighLevel returned no task id" };
  }
  return { ok: true, data: result.data.task };
}

export type SignupWebhookPayload = {
  firm_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  practice_area: string;
  website: string;
  your_name: string;
};

// "List Your Firm" signup — inbound-webhook workflow trigger, not the
// contacts/opportunities REST API: a plain POST to a pre-authorized
// absolute URL, so it doesn't go through request() (which targets BASE_URL
// with the Bearer/Version headers those endpoints need). Same best-effort
// contract as every other function here — never throws.
export async function triggerSignupWebhook(
  payload: SignupWebhookPayload,
): Promise<HighLevelResult<null>> {
  try {
    const res = await fetch(env.highlevel.webhookUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: await res.text() };
    }
    return { ok: true, data: null };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
