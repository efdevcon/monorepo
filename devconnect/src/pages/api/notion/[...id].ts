import { Client } from '@notionhq/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { GetPageResponse } from '@notionhq/client/build/src/api-endpoints';

// Define supported field types and their Notion property mappings
interface FieldConfig {
  name: string;
  type: 'text' | 'email' | 'file' | 'url' | 'formula';
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
function getFieldType(property: any): 'text' | 'email' | 'file' | 'url' | 'title' | 'select' | 'status' | 'checkbox' | 'formula' | 'rollup' | 'relation' | 'quests' | null {
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
    case 'formula':
      return 'formula';
    case 'rollup':
      return 'rollup';
    case 'relation':
      return 'relation';
    default:
      return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;

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

  if (method === 'GET') {
    return handleGet(req, res, pageId, password);
  } else if (method === 'PATCH') {
    return handlePatch(req, res, pageId, password);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}


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

// Helper function to fetch supporter data from rollup
async function fetchSupporterFromRollup(pageProperties: any, notion: Client): Promise<string> {
  // Look for "Parent item" relation in the current page properties
  const parentRelation = pageProperties["Parent item"];
  if (parentRelation && parentRelation.type === 'relation' && parentRelation.relation && parentRelation.relation.length > 0) {
    const parentPageId = parentRelation.relation[0].id;

    try {
      const parentPage = await notion.pages.retrieve({ page_id: parentPageId });
      const parentProperties = (parentPage as any).properties;

      // Look for "Supporters Tracker" in parent page
      const supportersTracker = parentProperties["Supporters Tracker"];
      if (supportersTracker && supportersTracker.relation && supportersTracker.relation.length > 0) {
        const supporterPageId = supportersTracker.relation[0].id;
        const supporterPage = await notion.pages.retrieve({ page_id: supporterPageId });
        const supporterData = supporterPage as any;

        // Extract supporter name/title like in organization API
        return supporterData.properties?.['Name']?.title?.[0]?.plain_text ||
          supporterData.properties?.Name?.title?.[0]?.plain_text ||
          supporterData.properties?.Title?.title?.[0]?.plain_text ||
          'Unknown Supporter';
      }
    } catch (error) {
      console.error('Failed to fetch supporter data from rollup:', error);
    }
  }

  return '';
}

// GET: Fetch page data for the given id
async function handleGet(req: NextApiRequest, res: NextApiResponse, pageId: string, password: string) {
  const supporter = !req.query?.supporter ? false : true;
  const notion = new Client({ auth: process.env.NOTION_SECRET });
  try {
    const page = await notion.pages.retrieve({ page_id: pageId }) as GetPageResponse;
    
    // Check if the page has properties (it should be a page object)
    if (page.object !== 'page' || !('properties' in page)) {
      return res.status(400).json({ error: 'Invalid page object' });
    }

    // Validate password before proceeding
    const isPasswordValid = await validatePassword(page.properties, password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid or missing password' });
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
      type: 'text' | 'email' | 'file' | 'url' | 'title' | 'select' | 'status' | 'checkbox' | 'formula' | 'rollup' | 'relation' | 'quests';
      mode: 'edit' | 'read';
      order: number;
      description?: string;
      options?: Array<{ name: string; color?: string }>;
    }> = [];

    // Check if any [config] field contains [lock] to determine if all fields should be read-only
    let isLocked = false;
    let isOk = false;
    const configFields: Array<{ name: string; value: string; order: number }> = [];

    // console.log('page.properties', JSON.stringify(page.properties, null, 2));

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
            // Concatenate all text content from rich_text array
            fieldValue = (property.rich_text || []).map((item: any) => item.text?.content || '').join('');
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
        case 'formula':
          if (propertyAny.type === 'formula') {
            // Handle different formula result types
            const formulaResult = propertyAny.formula;
            if (formulaResult) {
              if (formulaResult.type === 'string') {
                fieldValue = formulaResult.string || '';
              } else if (formulaResult.type === 'number') {
                fieldValue = formulaResult.number?.toString() || '';
              } else if (formulaResult.type === 'boolean') {
                fieldValue = formulaResult.boolean ? 'true' : 'false';
              } else if (formulaResult.type === 'date') {
                fieldValue = formulaResult.date?.start || '';
              }
            }
          }
          break;
        case 'rollup':
          if (propertyAny.type === 'rollup') {
            // Handle rollup fields - they are read-only calculated fields
            fieldValue = '[Calculated Field]';
          }
          break;
        default:
          fieldValue = '[UNSUPPORTED TYPE]';
          break;
      }

      configFields.push({ name: fieldName, value: fieldValue, order });
      // Check if this config field contains [lock]
      if (fieldValue.includes('[lock]')) {
        isLocked = true;
      }
      if (fieldValue.includes('[ok]')) {
        isOk = true;
      }
    }

    // Second pass: collect all [edit] and [read] fields
    for (const [propertyName, property] of Object.entries(page.properties)) {
      const { name: fieldName, mode, order } = extractFieldName(propertyName);
      if (!fieldName || (mode !== 'edit' && mode !== 'read')) continue;

      let fieldType = getFieldType(property);
      if (!fieldType) continue;

      let fieldValue = '';
      const propertyAny = property as any;

      switch (fieldType) {
        case 'text':
          if (property.type === 'rich_text') {
            // Concatenate all text content from rich_text array
            fieldValue = (property.rich_text || []).map((item: any) => item.text?.content || '').join('');
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
        case 'formula':
          if (propertyAny.type === 'formula') {
            // Handle different formula result types
            const formulaResult = propertyAny.formula;
            if (formulaResult) {
              if (formulaResult.type === 'string') {
                fieldValue = formulaResult.string || '';
              } else if (formulaResult.type === 'number') {
                fieldValue = formulaResult.number?.toString() || '';
              } else if (formulaResult.type === 'boolean') {
                fieldValue = formulaResult.boolean ? 'true' : 'false';
              } else if (formulaResult.type === 'date') {
                fieldValue = formulaResult.date?.start || '';
              }
            }
          }
          break;
        case 'relation':
          if (propertyAny.type === 'relation') {
            // For quests, we need to get the password for each quest if supporter is true
            if (supporter && propertyAny.relation && propertyAny.relation.length > 0) {
              // Get passwords for each quest
              const questIdsWithPasswords = await Promise.all(
                propertyAny.relation.map(async (item: any) => {
                  try {
                    const questPage = await notion.pages.retrieve({ page_id: item.id });
                    const questProperties = (questPage as any).properties;

                    // Get the password from the quest page
                    const questPassword = questProperties["Form password"];
                    let password = '';

                    if (questPassword) {
                      if (questPassword.type === 'formula' && questPassword.formula?.type === 'number') {
                        password = questPassword.formula.number?.toString() || '';
                      } else if (questPassword.type === 'rich_text') {
                        password = questPassword.rich_text?.[0]?.plain_text || '';
                      } else if (questPassword.type === 'title') {
                        password = questPassword.title?.[0]?.plain_text || '';
                      } else if (questPassword.type === 'select') {
                        password = questPassword.select?.name || '';
                      }
                    }

                    // Return id-password format
                    return password ? `${item.id?.replaceAll('-', '')}-${password}` : item.id?.replaceAll('-', '');
                  } catch (error) {
                    console.error('Failed to fetch quest password:', error);
                    // Fallback to just the ID if password fetch fails
                    return item.id?.replaceAll('-', '');
                  }
                })
              );
              fieldValue = questIdsWithPasswords.join(',');
            } else {
              // return list of ids without passwords
              fieldValue = propertyAny.relation?.map((item: any) => `${item.id?.replaceAll('-', '')}`).join(',') || '';
            }
            fieldType = 'quests';
          }
          break;
        case 'rollup':
          if (propertyAny.type === 'rollup') {
            // Handle rollup fields - fetch supporter data if rollup is empty
            const rollupResult = propertyAny.rollup;

            if (rollupResult && rollupResult.type === 'array') {
              const arrayValues = rollupResult.array || [];

              // Check if rollup is empty but we have a parent with Supporters Tracker
              if (arrayValues.length === 0 || (arrayValues.length === 1 && arrayValues[0].type === 'relation' && arrayValues[0].relation.length === 0)) {
                // Try to fetch supporter data from parent page
                const supporterName = await fetchSupporterFromRollup(page.properties, notion);
                fieldValue = supporterName || '[Calculated Field]';
              } else {
                // Process normal rollup array
                const processedValues = arrayValues.map((item: any) => {
                  if (item.type === 'select' && item.select) {
                    return item.select.name;
                  } else if (item.type === 'status' && item.status) {
                    return item.status.name;
                  } else if (item.type === 'title' && item.title) {
                    return item.title[0]?.plain_text || '';
                  } else if (item.type === 'rich_text' && item.rich_text) {
                    return item.rich_text[0]?.plain_text || '';
                  } else if (item.type === 'number' && item.number !== undefined) {
                    return item.number.toString();
                  } else if (item.type === 'checkbox') {
                    return item.checkbox ? 'true' : 'false';
                  } else if (item.type === 'date' && item.date) {
                    return item.date.start || '';
                  }
                  return '';
                }).filter(Boolean);

                fieldValue = processedValues.join(', ');
              }
            } else if (rollupResult) {
              // Handle other rollup types
              if (rollupResult.type === 'string') {
                fieldValue = rollupResult.string || '';
              } else if (rollupResult.type === 'number') {
                fieldValue = rollupResult.number?.toString() || '';
              } else if (rollupResult.type === 'boolean') {
                fieldValue = rollupResult.boolean ? 'true' : 'false';
              } else if (rollupResult.type === 'date') {
                fieldValue = rollupResult.date?.start || '';
              } else {
                fieldValue = '[Calculated Field]';
              }
            } else {
              fieldValue = '[Calculated Field]';
            }
          }
          break;
        default:
          fieldValue = '[UNSUPPORTED TYPE]';
          break;
      }

      // Extract description and options from database schema if available
      let description: string | undefined;
      let options: Array<{ name: string; color?: string }> | undefined;
      if (databaseSchema && databaseSchema.properties && databaseSchema.properties[propertyName]) {
        const propertySchema = databaseSchema.properties[propertyName];
        if (propertySchema.description) {
          description = propertySchema.description;
        }
        // Extract select options if this is a select field
        if (fieldType === 'select' && propertySchema.select && propertySchema.select.options) {
          options = propertySchema.select.options.map((option: any) => ({
            name: option.name,
            color: option.color
          }));
        }
      } else if (fieldType === 'select') {
        // Fallback: try to get options directly from the property if database schema is not available
        const propertyAny = property as any;
        if (propertyAny.select && propertyAny.select.options) {
          options = propertyAny.select.options.map((option: any) => ({
            name: option.name,
            color: option.color
          }));
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
        description: description,
        options: options
      });
    }

    if (supporter) {
      fields.push({
        name: 'Supporter name',
        value: (page.properties?.['Name'] as any)?.title?.[0]?.plain_text || '',
        type: 'text',
        mode: 'read',
        order: 0,
      });
    }
    

    // Sort fields by order
    fields.sort((a, b) => a.order - b.order);

    // Return flat array of fields with config information
    return res.status(200).json({
      fields,
      config: {
        isLocked,
        isOk
      },
      descriptionLinks: {
        'attached insurance guide': process.env.ACCREDITATION_INSURANCE_GUIDE || '',
        'Devconnect ARG Terms & Conditions': 'https://drive.google.com/file/d/1QHOHnvlZ-KvY8lE97bcmF176fgdyCjmt/view',
        'Devconnect ARG Code of Conduct': 'https://drive.google.com/file/d/1OgE4JTQwB0vkCHYpsmxZeHvkzQ5bjiSN/view',
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch page data' });
  }
}

// PATCH: Update page with submitted form data
async function handlePatch(req: NextApiRequest, res: NextApiResponse, pageId: string, password: string) {
  const notion = new Client({ auth: process.env.NOTION_SECRET });
  try {
    const formData = req.body;
    const updates: Record<string, any> = {};

    // First, get the page to find all editable properties
    const page = await notion.pages.retrieve({ page_id: pageId }) as GetPageResponse;
    
    if (page.object !== 'page' || !('properties' in page)) {
      return res.status(400).json({ error: 'Invalid page object' });
    }

    // Validate password before proceeding
    const isPasswordValid = await validatePassword(page.properties, password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid or missing password' });
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
        case 'formula':
          if (propertyAny.type === 'formula') {
            // Handle different formula result types
            const formulaResult = propertyAny.formula;
            if (formulaResult) {
              if (formulaResult.type === 'string') {
                fieldValue = formulaResult.string || '';
              } else if (formulaResult.type === 'number') {
                fieldValue = formulaResult.number?.toString() || '';
              } else if (formulaResult.type === 'boolean') {
                fieldValue = formulaResult.boolean ? 'true' : 'false';
              } else if (formulaResult.type === 'date') {
                fieldValue = formulaResult.date?.start || '';
              }
            }
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
        case 'select':
          updates[propertyName] = { select: value ? { name: value } : null };
          break;
        // case 'title':
        //   updates[propertyName] = { title: value ? [{ text: { content: value } }] : [] };
        //   break;
      }

      // Special handling for Insurance field - also update "Insurance link" field
      if (fieldName === 'Insurance' && value) {
        updates["Insurance link"] = { rich_text: value ? [{ text: { content: value } }] : [] }
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
