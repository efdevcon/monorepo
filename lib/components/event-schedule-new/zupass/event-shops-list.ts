type EventShop = {
  supabase_id: string
  coupon_collection: string
  zupass_proof_id?: string
  custom_url_id?: string
  global_coupon?: string
}

export const eventShops: EventShop[] = [
  {
    supabase_id: "86",
    custom_url_id: 'DSS',
    zupass_proof_id: "Devconnect ARG",
    coupon_collection: "dss-voucher-gating",
  },
];
