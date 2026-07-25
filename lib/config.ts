// T5: Shared site config.
//
// HOMEPAGE_MODE is the ONLY thing that decides what `/` renders
// (CLAUDE.md hard rule 2). `/company` always renders NationalHome
// regardless of this flag.
export const HOMEPAGE_MODE: "phoenix" | "national" = "phoenix";

// Legal Search Hub LLC's own NAP (name/address/phone/hours) — must match
// the Google Business Profile verbatim (T23 audits this). Single source of
// truth: import this constant, never hand-type the address/phone anywhere
// else (CLAUDE.md hard rule 3). Values confirmed by the user in the
// pre-scaffold planning session.
export const COMPANY_NAP = {
  name: "Legal Search Hub LLC",
  address: "101 North First Ave, Suite 2325-1116, Phoenix, AZ 85003",
  phone: "602-905-7022",
  hours: {
    mon: "9:00 AM–5:00 PM",
    tue: "9:00 AM–5:00 PM",
    wed: "9:00 AM–5:00 PM",
    thu: "9:00 AM–5:00 PM",
    fri: "9:00 AM–5:00 PM",
    sat: "Closed",
    sun: "Closed",
  },
} as const;
