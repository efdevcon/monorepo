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
    } catch (pageErr) {
      return res.status(500).json({ error: 'Failed to retrieve page details' });
    }

    // Check if there are relation properties that might contain sub-items
    const properties = (pageDetails as any).properties || {};
    const relationProperties = Object.entries(properties).filter(([key, value]: [string, any]) => {
      return value && typeof value === 'object' && value.type === 'relation';
    });
    
    const pageName = pageDetails.properties?.['Projects / Events / Hubs Name']?.title?.[0]?.plain_text || '';

    let subItems: any[] = [];

    // First try to get sub-items from relation properties
    for (const [propertyName, property] of relationProperties) {
      try {
        const propertyData = property as any;
        if (propertyData.relation && propertyData.relation.length > 0) {
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
                    default:
                      return false;
                  }
                });
                
                const completionPercentage = editFields.length > 0 
                  ? Math.round((completedFields.length / editFields.length) * 100)
                  : 0;
                
                // Get status
                const status = pageData.properties?.Status?.status?.name || 'No Status';
                
                return {
                  id: relation.id?.replace(/-/g, ''),
                  completionPercentage,
                  status
                };
              } catch (err) {
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
      } catch (err) {
        // Continue to next property
      }
    }

    // If no sub-items found in relations, try child pages
    if (subItems.length === 0) {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100
      });

      const pageBlocks = response.results.filter((block: any) => block.type === 'child_page');
      
      subItems = await Promise.all(
        pageBlocks.map(async (block: any) => {
          try {
            const page = await notion.pages.retrieve({ page_id: block.id });
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
                default:
                  return false;
              }
            });
            
            const completionPercentage = editFields.length > 0 
              ? Math.round((completedFields.length / editFields.length) * 100)
              : 0;
            
            // Get status
            const status = pageData.properties?.Status?.status?.name || 'No Status';
            
            return {
              id: block.id?.replace(/-/g, ''),
              completionPercentage,
              status
            };
          } catch (err) {
            return {
              id: block.id?.replace(/-/g, ''),
              completionPercentage: 0,
              status: 'No Status'
            };
          }
        })
      );
    }
    
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
