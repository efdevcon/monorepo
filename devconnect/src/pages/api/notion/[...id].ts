import { Client } from '@notionhq/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { GetPageResponse } from '@notionhq/client/build/src/api-endpoints';

// Define supported field types and their Notion property mappings
interface FieldConfig {
  name: string;
  type: 'text' | 'email' | 'file' | 'url';
}

// Helper function to extract field name from "[edit] fieldname", "[read] fieldname", or "[config] fieldname" format
function extractFieldName(propertyName: string): { name: string | null; mode: 'edit' | 'read' | 'config' | null; order: number } {
// Handle numbered prefixes like "1.[read]", "2.[edit]", or "3.[config]"
  const numberedEditMatch = propertyName.match(/^(\d+)\.\[edit\]\s*(.+)$/);
  const numberedReadMatch = propertyName.match(/^(\d+)\.\[read\]\s*(.+)$/);
  const numberedConfigMatch = propertyName.match(/^(\d+)\.\[config\]\s*(.+)$/);
  
  // Handle regular prefixes without numbers
  const editMatch = propertyName.match(/^\[edit\]\s*(.+)$/);
  const readMatch = propertyName.match(/^\[read\]\s*(.+)$/);
  const configMatch = propertyName.match(/^\[config\]\s*(.+)$/);
  
  if (numberedEditMatch) {
    return { name: numberedEditMatch[2].trim(), mode: 'edit', order: parseInt(numberedEditMatch[1]) };
  } else if (numberedReadMatch) {
    return { name: numberedReadMatch[2].trim(), mode: 'read', order: parseInt(numberedReadMatch[1]) };
  } else if (numberedConfigMatch) {
    return { name: numberedConfigMatch[2].trim(), mode: 'config', order: parseInt(numberedConfigMatch[1]) };
  } else if (editMatch) {
    return { name: editMatch[1].trim(), mode: 'edit', order: 999 }; // Default high order for non-numbered
  } else if (readMatch) {
    return { name: readMatch[1].trim(), mode: 'read', order: 999 }; // Default high order for non-numbered
  } else if (configMatch) {
    return { name: configMatch[1].trim(), mode: 'config', order: 999 }; // Default high order for non-numbered
  }
  
  return { name: null, mode: null, order: 999 };
}

// Helper function to determine field type from Notion property
function getFieldType(property: any): 'text' | 'email' | 'file' | 'url' | 'title' | 'select' | 'status' | 'checkbox' | null {
  switch (property.type) {
    case 'rich_text':
      return 'text';
    case 'email':
      return 'email';
    case 'files':
      return 'file';
    case 'url':
      return 'url';
    case 'title':
      return 'title';
    case 'select':
      return 'select';
    case 'status':
      return 'status';
    case 'checkbox':
      return 'checkbox';
    default:
      return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;

  // Handle catch-all route - id is an array, we want the first element
  const pageId = Array.isArray(id) ? id[0] : id;

  if (!pageId || typeof pageId !== 'string') {
    return res.status(400).json({ error: 'Invalid page ID' });
  }

  if (method === 'GET') {
    return handleGet(req, res, pageId);
  } else if (method === 'PATCH') {
    return handlePatch(req, res, pageId);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// GET: Fetch page data for the given id
async function handleGet(req: NextApiRequest, res: NextApiResponse, pageId: string) {
  const notion = new Client({ auth: process.env.NOTION_SECRET });
  try {
    const page = await notion.pages.retrieve({ page_id: pageId }) as GetPageResponse;
    
    // Check if the page has properties (it should be a page object)
    if (page.object !== 'page' || !('properties' in page)) {
      return res.status(400).json({ error: 'Invalid page object' });
    }
    
    // Get database schema to access field descriptions
    let databaseSchema: any = null;
    if (page.parent && page.parent.type === 'database_id') {
      try {
        const database = await notion.databases.retrieve({ database_id: page.parent.database_id });
        databaseSchema = database;
      } catch (err) {
        // Continue without database schema if it fails
      }
    }

    const fields: Array<{
      name: string;
      value: string;
      type: 'text' | 'email' | 'file' | 'url' | 'title' | 'select' | 'status' | 'checkbox';
      mode: 'edit' | 'read';
      order: number;
      description?: string;
    }> = [];

    // Check if any [config] field contains [lock] to determine if all fields should be read-only
    let isLocked = false;
    const configFields: Array<{ name: string; value: string; order: number }> = [];

    // First pass: collect config fields and check for lock
    for (const [propertyName, property] of Object.entries(page.properties)) {
      const { name: fieldName, mode, order } = extractFieldName(propertyName);
      if (!fieldName || mode !== 'config') continue;



      const fieldType = getFieldType(property);
      if (!fieldType) continue;

      let fieldValue = '';
      const propertyAny = property as any;

      switch (fieldType) {
        case 'text':
          if (property.type === 'rich_text') {
            fieldValue = property.rich_text?.[0]?.plain_text || '';
          }
          break;
        case 'select':
          if (property.type === 'select') {
            fieldValue = property.select?.name || '';
          }
          break;
        case 'status':
          if (propertyAny.type === 'status') {
            fieldValue = propertyAny.status?.name || '';
          }
          break;
        case 'checkbox':
          if (propertyAny.type === 'checkbox') {
            fieldValue = propertyAny.checkbox ? 'true' : 'false';
          }
          break;
      }

      configFields.push({ name: fieldName, value: fieldValue, order });
      // Check if this config field contains [lock]
      if (fieldValue.includes('[lock]')) {
        isLocked = true;
      }
    }

    // Second pass: collect all [edit] and [read] fields
    for (const [propertyName, property] of Object.entries(page.properties)) {
      const { name: fieldName, mode, order } = extractFieldName(propertyName);
      if (!fieldName || (mode !== 'edit' && mode !== 'read')) continue;

      const fieldType = getFieldType(property);
      if (!fieldType) continue;

      let fieldValue = '';
      const propertyAny = property as any;

      switch (fieldType) {
        case 'text':
          if (property.type === 'rich_text') {
            fieldValue = property.rich_text?.[0]?.plain_text || '';
          }
          break;
        case 'email':
          if (property.type === 'email') {
            fieldValue = property.email || '';
          }
          break;
        case 'url':
          if (property.type === 'url') {
            fieldValue = property.url || '';
          }
          break;
        case 'file':
          if (property.type === 'files') {
            const file = property.files?.[0];
            if (file && file.type === 'external') {
              fieldValue = file.external.url || '';
            }
          }
          break;
        case 'title':
          if (property.type === 'title') {
            fieldValue = property.title?.[0]?.plain_text || '';
          }
          break;
        case 'select':
          if (property.type === 'select') {
            fieldValue = property.select?.name || '';
          }
          break;
        case 'status':
          if (propertyAny.type === 'status') {
            fieldValue = propertyAny.status?.name || '';
          }
          break;
        case 'checkbox':
          if (propertyAny.type === 'checkbox') {
            fieldValue = propertyAny.checkbox ? 'true' : 'false';
          }
          break;
      }

      // Extract description from database schema if available
      let description: string | undefined;
      if (databaseSchema && databaseSchema.properties && databaseSchema.properties[propertyName]) {
        const propertySchema = databaseSchema.properties[propertyName];
        if (propertySchema.description) {
          description = propertySchema.description;
        }
      }

      // If locked, force all fields to read mode
      const finalMode = isLocked ? 'read' : mode;

      // Add field to array with order
      fields.push({
        name: fieldName,
        value: fieldValue,
        type: fieldType,
        mode: finalMode,
        order: order,
        description: description
      });
    }
    
    // Sort fields by order
    fields.sort((a, b) => a.order - b.order);
    
    // Return flat array of fields with config information
    return res.status(200).json({
      fields,
      config: {
        isLocked
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch page data' });
  }
}

// PATCH: Update page with submitted form data
async function handlePatch(req: NextApiRequest, res: NextApiResponse, pageId: string) {
  const notion = new Client({ auth: process.env.NOTION_SECRET });
  try {
    const formData = req.body;
    const updates: Record<string, any> = {};

    // First, get the page to find all editable properties
    const page = await notion.pages.retrieve({ page_id: pageId }) as GetPageResponse;
    
    if (page.object !== 'page' || !('properties' in page)) {
      return res.status(400).json({ error: 'Invalid page object' });
    }

    // Check if any [config] field contains [lock] to prevent updates
    let isLocked = false;
    for (const [propertyName, property] of Object.entries(page.properties)) {
      const { name: fieldName, mode } = extractFieldName(propertyName);
      if (!fieldName || mode !== 'config') continue;

      const fieldType = getFieldType(property);
      if (!fieldType) continue;

      let fieldValue = '';
      const propertyAny = property as any;
      switch (fieldType) {
        case 'text':
          if (property.type === 'rich_text') {
            fieldValue = property.rich_text?.[0]?.plain_text || '';
          }
          break;
        case 'email':
          if (property.type === 'email') {
            fieldValue = property.email || '';
          }
          break;
        case 'url':
          if (property.type === 'url') {
            fieldValue = property.url || '';
          }
          break;
        case 'file':
          if (property.type === 'files') {
            const file = property.files?.[0];
            if (file && file.type === 'external') {
              fieldValue = file.external.url || '';
            }
          }
          break;
        case 'title':
          if (property.type === 'title') {
            fieldValue = property.title?.[0]?.plain_text || '';
          }
          break;
        case 'select':
          if (property.type === 'select') {
            fieldValue = property.select?.name || '';
          }
          break;
        case 'status':
          if (propertyAny.type === 'status') {
            fieldValue = propertyAny.status?.name || '';
          }
          break;
        case 'checkbox':
          if (propertyAny.type === 'checkbox') {
            fieldValue = propertyAny.checkbox ? 'true' : 'false';
          }
          break;
      }

      // Check if this config field contains [lock]
      if (fieldValue.includes('[lock]')) {
        isLocked = true;
        break;
      }
    }

    // If locked, reject all update requests
    if (isLocked) {
      return res.status(403).json({ error: 'Page is locked and cannot be updated' });
    }

    // Find all properties that start with "[edit]" and update them (ignore [read] fields)
    for (const [propertyName, property] of Object.entries(page.properties)) {
      const { name: fieldName, mode } = extractFieldName(propertyName);
      if (!fieldName || mode !== 'edit') continue; // Only process [edit] fields

      const value = formData[fieldName];
      // Process the field even if it's empty to allow clearing values
      if (value === undefined) continue; // Skip if field wasn't submitted

      const fieldType = getFieldType(property);
      if (!fieldType) continue;

      switch (fieldType) {
        case 'text':
          updates[propertyName] = { rich_text: value ? [{ text: { content: value } }] : [] };
          break;
        case 'email':
          updates[propertyName] = { email: value || null };
          break;
        case 'url':
          updates[propertyName] = { url: value || null };
          break;
        case 'file':
          updates[propertyName] = { files: value ? [{ name: 'External File', external: { url: value } }] : [] };
          break;
        case 'checkbox':
          updates[propertyName] = { checkbox: value === 'true' || value === true };
          break;
        // case 'title':
        //   updates[propertyName] = { title: value ? [{ text: { content: value } }] : [] };
        //   break;
        // case 'select':
        //   updates[propertyName] = { select: value ? { name: value } : null };
        //   break;
      }
    }

    await notion.pages.update({
      page_id: pageId,
      properties: updates,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update page' });
  }
}
