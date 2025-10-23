export interface Merchant {
  posNumber: string;
  id: string;
  name: string;
}

export const MERCHANTS: Record<string, Merchant> = {
  '6603276727aaa6386588474d': {
    posNumber: '1',
    id: 'cafe-cuyo',
    name: 'Cafe Cuyo',
  }
};

export const getMerchantById = (id: string): Merchant | undefined => {
  return MERCHANTS[id];
};

export const getMerchantName = (id: string): string => {
  const merchant = getMerchantById(id);
  return merchant ? merchant.name : id;
};
