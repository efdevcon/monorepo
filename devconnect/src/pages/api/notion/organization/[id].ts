import { Client } from '@notionhq/client';
import type { NextApiRequest, NextApiResponse } from 'next';

// Helper function to validate password against page properties
async function validatePassword(pageProperties: any, providedPassword: string): Promise<boolean> {
  const formPassword = pageProperties["Form password"];
  if (!formPassword) {
    return false; // No password set on the page
  }

  // Extract password value based on property type
  let storedPassword = '';
  if (formPassword.type === 'rich_text') {
    storedPassword = formPassword.rich_text?.[0]?.plain_text || '';
  } else if (formPassword.type === 'title') {
    storedPassword = formPassword.title?.[0]?.plain_text || '';
  } else if (formPassword.type === 'select') {
    storedPassword = formPassword.select?.name || '';
  } else if (formPassword.type === 'formula') {
    // Handle formula type - convert number to string for comparison
    const formulaResult = formPassword.formula;
    if (formulaResult && formulaResult.type === 'number') {
      storedPassword = formulaResult.number?.toString() || '';
    }
  }

  return storedPassword === providedPassword;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle catch-all route - id is an array, we want the first element
  const idParam = Array.isArray(id) ? id[0] : id;

  if (!idParam || typeof idParam !== 'string') {
    return res.status(400).json({ error: 'Invalid page ID' });
  }

  // Parse id-password format
  const idParts = idParam.split('-');
  if (idParts.length < 2) {
    return res.status(400).json({ error: 'Invalid page ID format. Expected id-password format' });
  }

  const password = idParts.pop(); // Get the last part as password
  const pageId = idParts.join('-'); // Join remaining parts as page ID

  if (!pageId || !password) {
    return res.status(400).json({ error: 'Invalid page ID or password format' });
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

    // Validate password before proceeding
    const isPasswordValid = await validatePassword(pageDetails.properties, password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid or missing password' });
    }

    // Check if there are relation properties that might contain sub-items
    const properties = (pageDetails as any).properties || {};
    const relationProperties = Object.entries(properties).filter(([key, value]: [string, any]) => {
      return value && typeof value === 'object' && value.type === 'relation';
    });
    
    const orgName = pageDetails.properties?.['Org']?.title?.[0]?.plain_text || 'Unknown Org';
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
                  return key.includes('[edit]') && !key.includes('(optional)');
                });

                // Name
                const nameProperty = Object.entries(properties).find(([key, value]: [string, any]) => {
                  return key.includes('Name');
                });
                const name = (nameProperty?.[1] as any)?.rich_text?.[0]?.plain_text || '';

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
                    case 'select':
                      return value.select && value.select.name && value.select.name.trim() !== '';
                    case 'status':
                      return value.status && value.status.name && value.status.name.trim() !== '';
                    case 'formula':
                      // Handle different formula result types
                      if (value.formula) {
                        if (value.formula.type === 'string') {
                          return value.formula.string && value.formula.string.trim() !== '';
                        } else if (value.formula.type === 'number') {
                          return value.formula.number !== null && value.formula.number !== undefined;
                        } else if (value.formula.type === 'boolean') {
                          return value.formula.boolean === true;
                        } else if (value.formula.type === 'date') {
                          return value.formula.date && value.formula.date.start;
                        }
                      }
                      return false;
                    case 'title':
                      return value.title && value.title.length > 0;
                    default:
                      console.log(`[UNSUPPORTED COMPLETION TYPE] Unsupported field type in completion check: ${value.type}`);
                      console.log(`[UNSUPPORTED COMPLETION TYPE] Field data:`, JSON.stringify(value, null, 2));
                      console.log(`[UNSUPPORTED COMPLETION TYPE] Field keys:`, Object.keys(value));
                      return false;
                  }
                });

                const completionPercentage = editFields.length > 0
                  ? Math.round((completedFields.length / editFields.length) * 100)
                  : 0;


                // Get accreditation type
                const accreditationType = pageData.properties?.['0.[read] Accreditation type']?.select?.name || 'Not found';
                // Get review status
                const reviewStatus = pageData.properties?.['[config] Review']?.status?.name?.replace('[lock] ', '') || 'No Status';
                // Get claim status
                const claimStatus = pageData.properties?.['[config] Claim']?.status?.name?.replace('[ok] ', '') || 'No Status';

                // console.log(`[API Call] Retrieved sub-item ${relation.id}:`, {
                //   pageName: pageData.properties?.Name?.title?.[0]?.plain_text || 'Unknown',
                //   editFieldsCount: editFields.length,
                //   completedFieldsCount: completedFields.length,
                //   completionPercentage,
                //   status
                // });

                // Get password for this sub-item from already retrieved page data
                let password = '';
                const subItemProperties = pageData.properties;
                const subItemPassword = subItemProperties["Form password"];

                if (subItemPassword) {
                  if (subItemPassword.type === 'formula' && subItemPassword.formula?.type === 'number') {
                    password = subItemPassword.formula.number?.toString() || '';
                  } else if (subItemPassword.type === 'rich_text') {
                    password = subItemPassword.rich_text?.[0]?.plain_text || '';
                  } else if (subItemPassword.type === 'title') {
                    password = subItemPassword.title?.[0]?.plain_text || '';
                  } else if (subItemPassword.type === 'select') {
                    password = subItemPassword.select?.name || '';
                  }
                }

                return {
                  id: password ? `${relation.id?.replace(/-/g, '')}-${password}` : relation.id?.replace(/-/g, ''),
                  name: name,
                  completionPercentage,
                  accreditationType,
                  reviewStatus,
                  claimStatus
                };
              } catch (err) {
                // console.error(`[API Call] Failed to retrieve sub-item ${relation.id}:`, err);
                return {
                  id: relation.id?.replace(/-/g, ''),
                  completionPercentage: 0,
                  accreditationType: 'Not found',
                  reviewStatus: 'No Status',
                  claimStatus: 'No Status'
                };
              }
            })
          );

          subItems = [...subItems, ...relatedPages];
        }
      }
    }

    return res.status(200).json({
      children: subItems,
      count: subItems.length,
      orgName,
      accreditationGuideUrl: process.env.ACCREDITATION_GUIDE || ''
    });
  } catch (error) {
    console.error('Error fetching child pages:', error);
    return res.status(500).json({ error: 'Failed to fetch child pages' });
  }
}
