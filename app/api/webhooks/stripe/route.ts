import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrUpdateContact, createOpportunity } from "@/lib/highlevel";

// POST /api/webhooks/stripe — Stripe webhook handler (T19).
//
// checkout.session.completed  → firms.tier = 'premium', store
//                               stripe_subscription_id + the owner's
//                               profiles.stripe_customer_id, fire the
//                               HighLevel checkout-completed trigger.
// customer.subscription.deleted → revert to free, clear the subscription id.
// invoice.payment_failed      → log only. Stripe dunning retries the card;
//                               only the final failure deletes the
//                               subscription, which reverts the tier via the
//                               event above (business rule, ARCHITECTURE §6).
//
// All writes go through the service-role admin client — the guard triggers
// on firms/profiles explicitly exempt it. HighLevel is best-effort (rule
// 7): a HighLevel failure is logged, never retried by Stripe — but a failed
// DB write returns 500 so Stripe does retry the event. Handled events are
// idempotent, so Stripe redelivery is safe.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  // Raw body is required for signature verification — never parse first.
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      env.stripe.webhookSecret(),
    );
  } catch (err) {
    console.error("webhooks/stripe: signature verification failed", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const firmId = session.client_reference_id;
      if (!firmId) {
        // A session we didn't create (e.g. a dashboard payment link). Not
        // an error — but it means a payment with no automatic upgrade;
        // reconcile manually. Never 500: Stripe can't fix this by retrying.
        console.error(
          "webhooks/stripe: checkout session missing firm id — reconcile manually",
          { sessionId: session.id, customer: session.customer },
        );
        break;
      }
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription?.id ?? null);
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : (session.customer?.id ?? null);

      const { data: existing } = await supabase
        .from("firms")
        .select("id, name, status, tier, stripe_subscription_id, owner_id")
        .eq("id", firmId)
        .maybeSingle();
      if (!existing) {
        console.error("webhooks/stripe: checkout for unknown firm", {
          sessionId: session.id,
          firmId,
        });
        break;
      }
      // Idempotency: Stripe redelivers on any non-200/slow response. If the
      // firm is already premium on this subscription, the first delivery
      // fully processed — skip everything, especially the HighLevel
      // opportunity, which is NOT idempotent.
      if (
        existing.tier === "premium" &&
        existing.stripe_subscription_id === subscriptionId
      ) {
        break;
      }
      if (existing.status !== "live") {
        // Payment succeeded but the firm is pending/suspended — billing and
        // moderation state now diverge; an admin should look at this.
        console.warn("webhooks/stripe: upgrading non-live firm", {
          firmId,
          status: existing.status,
        });
      }

      const { error } = await supabase
        .from("firms")
        .update({
          tier: "premium",
          stripe_subscription_id: subscriptionId,
          // Keep the PREMIUM display badge in sync with billing by default
          // (docs/DESIGN-BADGES.md) — an admin can still override it via
          // /admin at any time; this only sets it on each fresh upgrade.
          premium_badge: true,
        })
        .eq("id", firmId);
      if (error) {
        console.error("webhooks/stripe: premium upgrade failed", error);
        return Response.json(
          { error: "Could not upgrade firm" },
          { status: 500 },
        );
      }
      const firm = existing;

      if (customerId && firm.owner_id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", firm.owner_id);
        if (profileError) {
          console.error(
            "webhooks/stripe: stripe_customer_id write failed",
            profileError,
          );
        }
      }

      // HighLevel checkout-completed trigger — best-effort (rule 7). The
      // owner's name/email live on their auth user, not profiles.
      if (firm.owner_id) {
        const { data: authData, error: userError } =
          await supabase.auth.admin.getUserById(firm.owner_id);
        const email = authData?.user?.email;
        if (userError || !email) {
          console.error(
            "webhooks/stripe: owner lookup for HighLevel failed",
            userError,
          );
        } else {
          const contact = await createOrUpdateContact({
            name:
              (authData.user.user_metadata?.full_name as string | undefined) ??
              email,
            email,
            tags: ["legal-search-hub", "premium-checkout"],
          });
          if (!contact.ok) {
            console.error(
              "webhooks/stripe: HighLevel contact sync failed",
              contact.error,
            );
          } else {
            const opportunity = await createOpportunity({
              contactId: contact.data.id,
              name: `Premium upgrade: ${firm.name}`,
            });
            if (!opportunity.ok) {
              console.error(
                "webhooks/stripe: HighLevel opportunity failed",
                opportunity.error,
              );
            }
          }
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const { data: reverted, error } = await supabase
        .from("firms")
        .update({
          tier: "free",
          stripe_subscription_id: null,
          premium_badge: false,
        })
        .eq("stripe_subscription_id", subscription.id)
        .select("id");
      if (error) {
        console.error("webhooks/stripe: tier revert failed", error);
        return Response.json(
          { error: "Could not revert tier" },
          { status: 500 },
        );
      }
      if (!reverted || reverted.length === 0) {
        // Zero-row updates aren't errors — but a miss here means billing
        // state and local state diverged (e.g. the completed event hadn't
        // landed yet). Retry-safe: Stripe's redelivery of completed will
        // re-match; anything else needs manual reconciliation.
        console.error(
          "webhooks/stripe: subscription deleted but no firm matched — reconcile manually",
          { subscriptionId: subscription.id },
        );
      }
      break;
    }

    case "invoice.payment_failed": {
      // Logged for visibility only — see the header comment for why no tier
      // change happens here.
      const invoice = event.data.object as Stripe.Invoice;
      console.warn("webhooks/stripe: payment failed", {
        invoiceId: invoice.id,
        customer: invoice.customer,
      });
      break;
    }

    default:
      // Stripe sends many event types; unhandled ones are fine.
      break;
  }

  return Response.json({ received: true });
}
