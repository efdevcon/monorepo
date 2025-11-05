export interface Merchant {
  posNumber: string;
  id: string;
  name: string;
}

export const MERCHANTS: Record<string, Merchant> = {
  '69091751563c0c276e0ac3a9': {
    posNumber: '1',
    id: 'pre-devcon-pop-up',
    name: 'Pre-Devcon Pop Up',
  },
  '6603276727aaa6386588474d': {
    posNumber: '2',
    id: 'cafe-cuyo',
    name: 'Cafe Cuyo',
  },
};

export const getMerchantById = (id: string): Merchant | undefined => {
  return MERCHANTS[id];
};

export const getMerchantName = (id: string): string => {
  const merchant = getMerchantById(id);
  return merchant ? merchant.name : id;
};
