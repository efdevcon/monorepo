export type EventShop = {
  supabase_id: string;
  coupon_collection?: string;
  gate_link_only?: boolean; // if no coupon collection, use store link
  zupass_proof_id?: string;
  custom_url_id?: string;
  global_coupon?: string;
  zupass_disabled?: boolean;
  hide_visit_site?: boolean;
};

const zupassGatingFallbackOn =
  process.env.NEXT_PUBLIC_ZUPASS_FALLBACK_ON === "true";

export const eventShops: EventShop[] = [
  {
    supabase_id: "86",
    custom_url_id: "DSS",
    zupass_proof_id: "Devconnect ARG",
    coupon_collection: "dss-voucher-gating",
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "71",
    zupass_proof_id: "Devconnect ARG",
    coupon_collection: "agenticzero",
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "109",
    zupass_proof_id: "Devconnect ARG",
    coupon_collection: "trustless-eil",
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "110",
    zupass_proof_id: "Devconnect ARG",
    coupon_collection: "trustless-interop-fixed",
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "104",
    zupass_proof_id: "Devconnect ARG",
    coupon_collection: "crecimiento",
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "108", // money rails event
    zupass_proof_id: "Devconnect ARG",
    gate_link_only: true,
    hide_visit_site: true,
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "76", // ethereum argentina
    zupass_proof_id: "Devconnect ARG",
    gate_link_only: true,
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "91", // ethereum argentina
    zupass_proof_id: "Devconnect ARG",
    coupon_collection: "bridge-atlas",
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "111",
    zupass_proof_id: "Devconnect ARG",
    coupon_collection: "zktls-gating",
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "119",
    zupass_proof_id: "Devconnect ARG",
    coupon_collection: "zkid-day",
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "136",
    zupass_proof_id: "Devconnect ARG",
    gate_link_only: true,
    hide_visit_site: true,
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "141",
    zupass_proof_id: "Devconnect ARG",
    coupon_collection: "privacy-stack",
    zupass_disabled: zupassGatingFallbackOn,
  },
  // {
  //   supabase_id: "113", // ethereum argentina
  //   zupass_proof_id: "Devconnect ARG",
  //   gate_link_only: true,
  //   zupass_disabled: zupassGatingFallbackOn,
  // },
];
