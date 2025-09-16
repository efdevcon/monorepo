import { useState, useEffect } from 'react';
import { Quest } from '@/types';

export interface QuestPOI {
  id: string;
  questId: string;
  name: string;
  category: string; // SVG category for map interaction
  questCategory: string; // Original quest category
  description: string;
  details?: string;
  currentEvent?: string;
  capacity?: string;
  amenities?: string[];
  heroImage?: string;
  logo?: string;
  companyDescription?: string;
  companies?: string[];
  websiteLink?: string;
  socialLink?: string;
}

export const useQuestPOIs = (): QuestPOI[] => {
  const [pois, setPois] = useState<QuestPOI[]>([]);

  useEffect(() => {
    const getQuestPOIs = (): QuestPOI[] => {
      try {
        const cachedQuests = localStorage.getItem('quests-data');
        if (!cachedQuests) return [];

        const quests: Quest[] = JSON.parse(cachedQuests);
        
        // console.log('Processing quests:', quests.length);
        
        const questPOIs = quests.map((quest, index) => {
          // Use the quest ID directly as the SVG ID since they're now descriptive
          const svgId = quest.id.toString();
          // console.log(`Using quest ID as SVG ID for "${quest.name}": ${svgId}`);
          
          // Use supporterId as category fallback, or derive from quest properties
          const category = quest.supporterId || 'general';
          
          return {
            id: svgId, // Use SVG element ID for map interaction
            questId: quest.id.toString(), // Keep original quest ID for API calls
            name: quest.name,
            category: category.toLowerCase(), // Use supporterId as category for map interaction
            questCategory: category, // Keep original quest category
            description: quest.instructions || quest.name,
            details: quest.conditionValues,
            currentEvent: quest.button,
            logo: quest.poapImageLink || undefined, // Use poapImageLink as logo
            heroImage: quest.poapImageLink || undefined,
            companyDescription: quest.instructions,
            amenities: [quest.action, quest.conditionType].filter(Boolean),
            websiteLink: undefined, // Not available in Quest interface
            socialLink: undefined, // Not available in Quest interface
          };
        });
                  console.log('questPOIs', questPOIs);
          // console.log('Original quests:', quests.map(q => ({ id: q.id, category: q.category })));
          // console.log('SVG IDs generated:', questPOIs.map(q => ({ questId: q.questId, svgId: q.id, category: q.category, name: q.name })));
          
          // Test if SVG elements exist
          questPOIs.forEach(poi => {
            const element = document.getElementById(poi.id);
            if (!element) {
              console.warn(`SVG element not found: ${poi.id} for quest: ${poi.name}`);
            }
          });
          
                    return questPOIs;
        } catch (error) {
          console.error('Error parsing quest data from localStorage:', error);
          return [];
        }
      };

      const newPois = getQuestPOIs();
      // console.log('Setting POIs:', newPois.length);
      setPois(newPois);
    }, []);

  return pois;
};
