import { useState } from 'react';
import { filterCategories } from '@/data/filterCategories';

export const useMapFilters = () => {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // Get POI color based on category
  const getPOIColor = (category: string) => {
    const categoryInfo = filterCategories.find((f) => f.key === category);
    return categoryInfo ? categoryInfo.color : 'bg-gray-100 text-gray-700';
  };

  // Get SVG filter for highlighted categories
  const getCategoryFilter = (category: string) => {
    if (!activeFilters.has(category)) return 'none';

    const filterMap: Record<string, string> = {
      cowork: 'url(#cowork-glow)',
      defi: 'url(#defi-glow)',
      biotech: 'url(#biotech-glow)',
      hardware: 'url(#hardware-glow)',
      social: 'url(#social-glow)',
      coffee: 'url(#coffee-glow)',
      fnb: 'url(#fnb-glow)',
      toilets: 'url(#toilets-glow)',
      'art-exhbition': 'url(#art-glow)',
      swag: 'url(#swag-glow)',
      entrance: 'url(#entrance-glow)',
    };

    return filterMap[category] || 'none';
  };

  // Helper function to determine if a category should be dimmed
  const shouldDimCategory = (category: string) => {
    if (activeFilters.size === 0) return false;
    return !activeFilters.has(category);
  };

  // Toggle filter - only one filter active at a time
  const toggleFilter = (category: string) => {
    const newFilters = new Set<string>();
    if (!activeFilters.has(category)) {
    // If category is not active, make it the only active one
      newFilters.add(category);
    }
    // If category is already active, deselect it (empty set)
    setActiveFilters(newFilters);
  };

  return {
    activeFilters,
    getPOIColor,
    getCategoryFilter,
    shouldDimCategory,
    toggleFilter,
  };
};
