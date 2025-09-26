export type EventShop = {
  supabase_id: string;
  coupon_collection?: string;
  gate_link_only?: boolean; // if no coupon collection, use store link
  zupass_proof_id?: string;
  custom_url_id?: string;
  global_coupon?: string;
  zupass_disabled?: boolean;
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
    zupass_disabled: zupassGatingFallbackOn,
  },
  {
    supabase_id: "113", // ethereum argentina
    zupass_proof_id: "Devconnect ARG",
    gate_link_only: true,
    zupass_disabled: zupassGatingFallbackOn,
  },
];
