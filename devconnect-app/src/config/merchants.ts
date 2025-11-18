export interface Merchant {
  posNumber: string;
  id: string;
  name: string;
}

export const MERCHANTS: Record<string, Merchant> = {
  '6603276727aaa6386588474d': {
    posNumber: '0',
    id: 'cafe-cuyo',
    name: 'Cafe Cuyo (Testing)',
  },
  // '6911fb470ce6a7a6a3c721d7': {
  //   posNumber: '1',
  //   id: 'barreto',
  //   name: 'Barreto',
  // },
  '6911fb2f0ce6a7a6a3c721d6': {
    posNumber: '1',
    id: 'beer-house',
    name: 'Beer House',
  },
  '6911fbabea5ff64e14b83895': {
    posNumber: '2',
    id: 'chicken-ten',
    name: 'Chicken Tenders',
  },
  '6911fbd8ea5ff64e14b83897': {
    posNumber: '3',
    id: 'guapaletas',
    name: 'Guapaletas',
  },
  '6911faaeea5ff64e14b83893': {
    posNumber: '4',
    id: 'burgers-1',
    name: 'Hamburgueseria 1A',
  },
  '6914b29b0ce6a7a6a3c725a6': {
    posNumber: '5',
    id: 'burgers-1-b',
    name: 'Hamburgueseria 1B',
  },
  '6911fadb0ce6a7a6a3c721d5': {
    posNumber: '6',
    id: 'burgers-2',
    name: 'Hamburgueseria 2A',
  },
  '6914b2b30ce6a7a6a3c725a7': {
    posNumber: '7',
    id: 'burgers-2-b',
    name: 'Hamburgueseria 2B',
  },
  '6911fb810ce6a7a6a3c721d8': {
    posNumber: '8',
    id: 'koi',
    name: 'KOI',
  },
  '6911fb5dea5ff64e14b83894': {
    posNumber: '9',
    id: 'le-ble',
    name: 'Le Ble módulo',
  },
  '6911fc290ce6a7a6a3c721d9': {
    posNumber: '10',
    id: 'los-petersen',
    name: 'Los Petersen 1',
  },
  '6914a123ea5ff64e14b83d74': {
    posNumber: '11',
    id: 'los-petersen-2',
    name: 'Los Petersen 2',
  },
  // TODO: replace with real merchant
  '6914a123ea5ff64e14b83d75': {
    posNumber: '14',
    id: 'los-petersen-3',
    name: 'Los Petersen 3',
  },
  '6911fbc5ea5ff64e14b83896': {
    posNumber: '12',
    id: 'persicco',
    name: 'Persicco',
  },
  '69138269ea5ff64e14b83b6f': {
    posNumber: '13',
    id: 'devcon-swag-shop',
    name: 'Swag Shop',
  },
};

export const getMerchantById = (id: string): Merchant | undefined => {
  return MERCHANTS[id];
};

export const getMerchantName = (id: string): string => {
  const merchant = getMerchantById(id);
  return merchant ? merchant.name : id;
};
