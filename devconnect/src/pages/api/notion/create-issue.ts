import { Client } from '@notionhq/client';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, wallet_type, browser, system, path, eoa_connector, address } = req.body;
  const databaseId = '294638cdc41580cb8908f333cab466a0';

  const notion = new Client({ auth: process.env.NOTION_SECRET });

  try {
    // Build properties object dynamically
    const properties: Record<string, any> = {};

    // Add title field (required by Notion) - using current date/time as default
    properties['Issue'] = {
      title: [{ text: { content: `Issue from ${email?.split('@')[0] || 'Unknown'}` } }],
    };

    // Add email property if provided
    if (email) {
      properties['0.[edit] Email'] = {
        email: email,
      };
    }

    // Add wallet type as hidden field if provided
    if (wallet_type) {
      properties['[hidden] wallet_type'] = {
        rich_text: [{ text: { content: wallet_type } }],
      };
    }

    // Add browser as hidden field if provided
    if (browser) {
      properties['[hidden] browser'] = {
        rich_text: [{ text: { content: browser } }],
      };
    }

    // Add system as hidden field if provided
    if (system) {
      properties['[hidden] system'] = {
        rich_text: [{ text: { content: system } }],
      };
    }

    // Add path as hidden field if provided
    if (path) {
      properties['[hidden] path'] = {
        rich_text: [{ text: { content: path } }],
      };
    }

    // Add eoa_connector as hidden field if provided
    if (eoa_connector) {
      properties['[hidden] eoa_connector'] = {
        rich_text: [{ text: { content: eoa_connector } }],
      };
    }

    // Add address as hidden field if provided
    if (address) {
      properties['[hidden] wallet_address'] = {
        rich_text: [{ text: { content: address } }],
      };
    }

    // Create a new page in the database
    const newPage = await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties,
    });

    // Retrieve the created page to get all properties including the password
    const pageData = await notion.pages.retrieve({ page_id: newPage.id });
    const pageProperties = (pageData as any).properties;

    // Extract the password from the page properties
    const formPassword = pageProperties["Form password"];
    let password = '';

    if (formPassword) {
      if (formPassword.type === 'formula' && formPassword.formula?.type === 'number') {
        password = formPassword.formula.number?.toString() || '';
      } else if (formPassword.type === 'rich_text') {
        password = formPassword.rich_text?.[0]?.plain_text || '';
      } else if (formPassword.type === 'title') {
        password = formPassword.title?.[0]?.plain_text || '';
      } else if (formPassword.type === 'select') {
        password = formPassword.select?.name || '';
      }
    }

    if (!password) {
      return res.status(500).json({ error: 'Failed to retrieve password for new entry' });
    }

    // Format the page ID without dashes and append password
    const pageIdWithoutDashes = newPage.id.replace(/-/g, '');
    const idPasswordFormat = `${pageIdWithoutDashes}-${password}`;

    return res.status(200).json({
      success: true,
      id: idPasswordFormat,
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    return res.status(500).json({ error: 'Failed to create new issue entry' });
  }
}

