import Stripe from "stripe";

import { env } from "@/lib/env";

// Stripe client (T18). The ONLY place this app's code constructs a Stripe
// client — checkout creation (T18) and the webhook handler (T19) both use
// this instance (CLAUDE.md rule 6).
//
// SERVER-ONLY: uses the secret API key. Never import from a Client
// Component.

let client: Stripe | null = null;

// Lazily constructed so importing this module in a context that never calls
// it (e.g. a page that only imports a type) doesn't require the key at
// module load.
export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(env.stripe.secretKey());
  }
  return client;
}
