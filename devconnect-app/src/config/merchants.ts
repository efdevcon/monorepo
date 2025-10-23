export interface Merchant {
  id: string;
  name: string;
}

export const MERCHANTS: Merchant[] = [
  {
    id: 'cafe-cuyo',
    name: '[1] - Cafe Cuyo'
  }
];

export const getMerchantById = (id: string): Merchant | undefined => {
  return MERCHANTS.find(merchant => merchant.id === id);
};

export const getMerchantName = (id: string): string => {
  const merchant = getMerchantById(id);
  return merchant ? merchant.name : id;
};
