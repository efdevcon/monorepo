import type { Districts } from '@/types/api-data';
import AiDistrictLogo from '@/images/districts/ai.png';
import CollectiblesDistrictLogo from '@/images/districts/collectibles.png';
import DefiDistrictLogo from '@/images/districts/defi.png';
import GamingDistrictLogo from '@/images/districts/gaming.png';
import HardwareWalletsDistrictLogo from '@/images/districts/hardware-wallets.png';
import L2sDistrictLogo from '@/images/districts/l2s.png';
import PrivacyDistrictLogo from '@/images/districts/privacy.png';
import SocialDistrictLogo from '@/images/districts/social.png';

export const districtsData: Districts = {
  "1": {
    "name": "AI",
    "layerName": "ai-district",
    "backgroundColor": "linear-gradient(0deg, rgb(170, 167, 255) 0%, rgb(246, 180, 14) 100%)",
    "logo": AiDistrictLogo.src
  },
  "2": {
    "name": "Collectibles",
    "layerName": "collectibles-district",
    "backgroundColor": "linear-gradient(0deg, rgb(255, 133, 166) 0%, rgb(238, 221, 51) 100%)",
    "logo": CollectiblesDistrictLogo.src
  },
  "3": {
    "name": "DeFi",
    "layerName": "defi-district",
    "backgroundColor": "linear-gradient(0deg, rgb(136, 85, 204) 0%, rgb(221, 102, 170) 100%)",
    "logo": DefiDistrictLogo.src
  },
  "4": {
    "name": "Gaming",
    "layerName": "gaming-district",
    "backgroundColor": "linear-gradient(0deg, rgb(136, 85, 204) 0%, rgb(238, 221, 51) 100%)",
    "logo": GamingDistrictLogo.src
  },
  "5": {
    "name": "Hardware & Wallets",
    "layerName": "hardware-wallets-district",
    "backgroundColor": "linear-gradient(0deg, rgb(116, 172, 223) 0%, rgb(238, 136, 34) 100%)",
    "logo": HardwareWalletsDistrictLogo.src
  },
  "6": {
    "name": "L2s",
    "layerName": "l2s-district",
    "backgroundColor": "linear-gradient(0deg, rgb(68, 221, 187) 0%, rgb(116, 172, 223) 100%)",
    "logo": L2sDistrictLogo.src
  },
  "7": {
    "name": "Privacy",
    "layerName": "privacy-district",
    "backgroundColor": "linear-gradient(0deg, rgb(54, 54, 76) 0%, rgb(68, 221, 187) 100%)",
    "logo": PrivacyDistrictLogo.src
  },
  "8": {
    "name": "Social",
    "layerName": "social-district",
    "backgroundColor": "linear-gradient(0deg, rgb(255, 133, 166) 0%, rgb(170, 167, 255) 100%)",
    "logo": SocialDistrictLogo.src
  }
};
