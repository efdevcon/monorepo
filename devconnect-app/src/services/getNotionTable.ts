'server only';
import { Client } from '@notionhq/client';

/**
 * Fetches all rows from a Notion database and resolves property values
 * @param databaseId - The Notion database ID to query
 * @param filter - Optional filter to apply to the query
 * @param notionSecret - The Notion API secret key (optional, defaults to process.env.NOTION_SECRET)
 * @param sortBy - Optional property name to sort by (descending order)
 * @returns Array of objects where each object represents a row with resolved property values
 */
export async function getNotionTable(
  databaseId: string,
  filter?: any,
  notionSecret?: string,
  sortBy?: string
): Promise<Array<Record<string, any>>> {
  const notion = new Client({
    auth: notionSecret || process.env.NOTION_SECRET,
  });

  // Fetch all results with pagination
  let allResults: any[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const queryParams: any = {
      database_id: databaseId,
      start_cursor: startCursor,
      page_size: 100,
    };

    if (filter) {
      queryParams.filter = filter;
    }

    if (sortBy) {
      queryParams.sorts = [
        {
          property: sortBy,
          direction: 'descending',
        },
      ];
    }

    const response = await notion.databases.query(queryParams);

    allResults = allResults.concat(response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor || undefined;
  }

  // Helper function to resolve property values based on type
  const resolvePropertyValue = (property: any): any => {
    if (!property) return null;

    switch (property.type) {
      case 'title':
        return property.title?.[0]?.plain_text || '';
      case 'rich_text':
        return property.rich_text?.[0]?.plain_text || '';
      case 'select':
        return property.select?.name || null;
      case 'multi_select':
        return property.multi_select?.map((item: any) => item.name) || [];
      case 'number':
        return property.number ?? null;
      case 'url':
        return property.url || '';
      case 'email':
        return property.email || '';
      case 'phone_number':
        return property.phone_number || '';
      case 'date':
        return property.date?.start || null;
      case 'checkbox':
        return property.checkbox;
      case 'files':
        return (
          property.files?.map(
            (file: any) => file.file?.url || file.external?.url
          ) || []
        );
      case 'people':
        return property.people?.map((person: any) => person.id) || [];
      case 'relation':
        return property.relation?.map((rel: any) => rel.id) || [];
      case 'unique_id':
        return property.unique_id?.prefix + property.unique_id?.number || '';
      case 'formula':
        const formulaResult = property.formula;
        if (!formulaResult) return null;
        if (formulaResult.type === 'string') return formulaResult.string || '';
        if (formulaResult.type === 'number')
          return formulaResult.number ?? null;
        if (formulaResult.type === 'boolean') return formulaResult.boolean;
        if (formulaResult.type === 'date')
          return formulaResult.date?.start || null;
        return null;
      case 'rollup':
        const rollupResult = property.rollup;
        if (!rollupResult) return null;
        if (rollupResult.type === 'number') return rollupResult.number ?? null;
        if (rollupResult.type === 'date')
          return rollupResult.date?.start || null;
        if (rollupResult.type === 'array') return rollupResult.array || [];
        return null;
      case 'created_time':
        return property.created_time;
      case 'created_by':
        return property.created_by?.id || null;
      case 'last_edited_time':
        return property.last_edited_time;
      case 'last_edited_by':
        return property.last_edited_by?.id || null;
      case 'status':
        return property.status?.name || null;
      default:
        return null;
    }
  };

  // Map each page to an object with resolved properties
  return allResults.map((page: any) => {
    const row: Record<string, any> = {
      id: page.id,
    };

    // Resolve each property
    for (const [propertyName, propertyValue] of Object.entries(
      page.properties
    )) {
      row[propertyName] = resolvePropertyValue(propertyValue);
    }

    return row;
  });
}
