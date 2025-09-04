import { Client } from '@notionhq/client';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pageId = Array.isArray(id) ? id[0] : id;

  if (!pageId || typeof pageId !== 'string') {
    return res.status(400).json({ error: 'Invalid page ID' });
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_SECRET });
    
    // Get the page details
    let pageDetails: any;
    try {
      pageDetails = await notion.pages.retrieve({ page_id: pageId });
      // console.log(`[API Call] Retrieved page details for ${pageId}:`, {
      //   pageName: pageDetails.properties?.['Projects / Events / Hubs Name']?.title?.[0]?.plain_text || 'Unknown',
      //   propertiesCount: Object.keys(pageDetails.properties || {}).length,
      //   hasRelations: Object.values(pageDetails.properties || {}).some((prop: any) => prop?.type === 'relation')
      // });
      // console.log(JSON.stringify(pageDetails, null, 2));
    } catch (pageErr) {
      console.error(`[API Call] Failed to retrieve page details for ${pageId}:`, pageErr);
      return res.status(500).json({ error: 'Failed to retrieve page details' });
    }

    // Check if there are relation properties that might contain sub-items
    const properties = (pageDetails as any).properties || {};
    const relationProperties = Object.entries(properties).filter(([key, value]: [string, any]) => {
      return value && typeof value === 'object' && value.type === 'relation';
    });
    
    const pageName = pageDetails.properties?.['Projects / Events / Hubs Name']?.title?.[0]?.plain_text || '';

    let subItems: any[] = [];

    // Get sub-items from relation properties (excluding Quest)
    for (const [propertyName, property] of relationProperties) {
      // Skip the Quest property
      if (propertyName === 'Quest') {
        // console.log(`[API Call] Skipping Quest property`);
        continue;
      }

      // Process Sub-item property with individual page retrievals for detailed data
      if (propertyName === 'Sub-item') {
        const propertyData = property as any;
        if (propertyData.relation && propertyData.relation.length > 0) {
          // console.log(`[API Call] Processing ${propertyData.relation.length} sub-items with detailed data`);

          const relatedPages = await Promise.all(
            propertyData.relation.map(async (relation: any) => {
              try {
                const page = await notion.pages.retrieve({ page_id: relation.id });
                const pageData = page as any;

                // Calculate completion percentage for edit fields
                const properties = pageData.properties || {};
                const editFields = Object.entries(properties).filter(([key, value]: [string, any]) => {
                  return key.includes('[edit]');
                });

                const completedFields = editFields.filter(([key, value]: [string, any]) => {
                  if (!value) return false;

                  switch (value.type) {
                    case 'rich_text':
                      return value.rich_text && value.rich_text.length > 0;
                    case 'email':
                      return value.email && value.email.trim() !== '';
                    case 'url':
                      return value.url && value.url.trim() !== '';
                    case 'files':
                      return value.files && value.files.length > 0;
                    case 'checkbox':
                      return value.checkbox === true;
                    default:
                      return false;
                  }
                });

                const completionPercentage = editFields.length > 0
                  ? Math.round((completedFields.length / editFields.length) * 100)
                  : 0;

                // Get status
                const status = pageData.properties?.['[config] Status']?.status?.name?.replace('[lock] ', '') || 'No Status';

                // console.log(`[API Call] Retrieved sub-item ${relation.id}:`, {
                //   pageName: pageData.properties?.Name?.title?.[0]?.plain_text || 'Unknown',
                //   editFieldsCount: editFields.length,
                //   completedFieldsCount: completedFields.length,
                //   completionPercentage,
                //   status
                // });

                return {
                  id: relation.id?.replace(/-/g, ''),
                  completionPercentage,
                  status
                };
              } catch (err) {
                // console.error(`[API Call] Failed to retrieve sub-item ${relation.id}:`, err);
                return {
                  id: relation.id?.replace(/-/g, ''),
                  completionPercentage: 0,
                  status: 'No Status'
                };
              }
            })
          );

          subItems = [...subItems, ...relatedPages];
        }
      }
    }

    // console.log(`[API Call] Final result for ${pageId}:`, {
    //   pageName: pageName || 'Organization',
    //   totalSubItems: subItems.length,
    //   subItemsWithData: subItems.filter(item => item.completionPercentage > 0 || item.status !== 'No Status').length
    // });

    return res.status(200).json({ 
      children: subItems,
      count: subItems.length,
      pageName: pageName || 'Organization'
    });
  } catch (error) {
    console.error('Error fetching child pages:', error);
    return res.status(500).json({ error: 'Failed to fetch child pages' });
  }
}
