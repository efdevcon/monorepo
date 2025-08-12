/**
 * Utility functions for working with Notion API responses
 */

export interface NotionProperty {
  id: string;
  type: string;
  [key: string]: any;
}

export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  url: string;
  properties: Record<string, NotionProperty>;
}

export interface Quest {
  id: string;
  created_time: string;
  last_edited_time: string;
  url: string;
  title?: string;
  description?: string;
  status?: string;
  difficulty?: string;
  rewards?: string;
  requirements?: string;
  category?: string;
  properties: Record<string, NotionProperty>;
}

/**
 * Extract text from a Notion title property
 */
export function extractTitle(property: NotionProperty): string {
  if (property.type === 'title' && property.title) {
    return property.title.map((item: any) => item.plain_text).join('') || '';
  }
  return '';
}

/**
 * Extract text from a Notion rich_text property
 */
export function extractRichText(property: NotionProperty): string {
  if (property.type === 'rich_text' && property.rich_text) {
    return property.rich_text.map((item: any) => item.plain_text).join('') || '';
  }
  return '';
}

/**
 * Extract text from a Notion select property
 */
export function extractSelect(property: NotionProperty): string {
  if (property.type === 'select' && property.select) {
    return property.select.name || '';
  }
  return '';
}

/**
 * Extract text from a Notion multi_select property
 */
export function extractMultiSelect(property: NotionProperty): string[] {
  if (property.type === 'multi_select' && property.multi_select) {
    return property.multi_select.map((item: any) => item.name) || [];
  }
  return [];
}

/**
 * Extract URL from a Notion url property
 */
export function extractUrl(property: NotionProperty): string {
  if (property.type === 'url' && property.url) {
    return property.url || '';
  }
  return '';
}

/**
 * Extract number from a Notion number property
 */
export function extractNumber(property: NotionProperty): number | null {
  if (property.type === 'number' && property.number !== undefined) {
    return property.number;
  }
  return null;
}

/**
 * Extract date from a Notion date property
 */
export function extractDate(property: NotionProperty): string {
  if (property.type === 'date' && property.date) {
    return property.date.start || '';
  }
  return '';
}

/**
 * Transform a Notion page into a Quest object
 */
export function transformNotionPageToQuest(page: NotionPage): Quest {
  const properties = page.properties;
  
  // Common property names - adjust these based on your actual database schema
  const title = extractTitle(properties.Title || properties.Name || properties['Quest Title'] || {});
  const description = extractRichText(properties.Description || properties['Quest Description'] || {});
  const status = extractSelect(properties.Status || properties['Quest Status'] || {});
  const difficulty = extractSelect(properties.Difficulty || properties['Quest Difficulty'] || {});
  const rewards = extractRichText(properties.Rewards || properties['Quest Rewards'] || {});
  const requirements = extractRichText(properties.Requirements || properties['Quest Requirements'] || {});
  const category = extractSelect(properties.Category || properties['Quest Category'] || {});

  return {
    id: page.id,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
    url: page.url,
    title,
    description,
    status,
    difficulty,
    rewards,
    requirements,
    category,
    properties,
  };
}
