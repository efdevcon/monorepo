import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  // Verify secret from query parameter
  const { secret } = req.query;
  const expectedSecret = process.env.FORM_SECRET;
  
  if (!secret || secret !== expectedSecret) {
    console.log('=== SECRET VERIFICATION FAILED ===');
    // console.log('Received secret:', secret);
    console.log('Expected secret:', expectedSecret ? '***' : 'NOT_SET');
    console.log('================================');
    
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Invalid or missing secret',
      timestamp: new Date().toISOString()
    });
  }

  console.log('=== SECRET VERIFICATION PASSED ===');
  console.log('================================');

  // Log all request information
  console.log('=== EMAIL WEBHOOK RECEIVED ===');
  // console.log('Method:', method);
  // console.log('URL:', req.url);
  // console.log('Headers:', req.headers);
  // console.log('Query params:', req.query);
  // console.log('Body:', req.body);
  // console.log('Raw body:', req.body);
  // console.log('Content-Type:', req.headers['content-type']);
  // console.log('User-Agent:', req.headers['user-agent']);
  // console.log('Timestamp:', new Date().toISOString());
  
  // Extract property values dynamically
  let extractedProperties: Record<string, string> = {};
  
  if (req.body?.data?.properties) {
    console.log('\n=== EXTRACTING PROPERTY VALUES ===');
    const properties = req.body.data.properties;
    console.log('Properties:', properties);
    
    Object.entries(properties).forEach(([key, value]) => {
      
      // Extract the actual value based on property type
      if (value && typeof value === 'object' && 'type' in value) {
        const valueAny = value as any;
        let extractedValue = '';
        
        if (valueAny.type === 'rich_text' && Array.isArray(valueAny.rich_text)) {
          extractedValue = valueAny.rich_text.map((rt: any) => rt.plain_text).join('');
          console.log('Extracted (rich_text):', extractedValue);
        } else if (valueAny.type === 'title' && Array.isArray(valueAny.title)) {
          extractedValue = valueAny.title.map((t: any) => t.plain_text).join('');
          console.log('Extracted (title):', extractedValue);
        } else if (valueAny.type === 'email') {
          extractedValue = valueAny.email || '';
          console.log('Extracted (email):', extractedValue);
        } else if (valueAny.type === 'url') {
          extractedValue = valueAny.url || '';
          console.log('Extracted (url):', extractedValue);
        } else if (valueAny.type === 'files' && Array.isArray(valueAny.files) && valueAny.files.length > 0) {
          // For files, get the first file URL
          const firstFile = valueAny.files[0];
          if (firstFile.type === 'external') {
            extractedValue = firstFile.external.url || '';
          } else if (firstFile.type === 'file') {
            extractedValue = firstFile.file.url || '';
          }
          console.log('Extracted (files):', extractedValue);
        } else if (valueAny.type === 'select') {
          extractedValue = valueAny.select?.name || '';
          console.log('Extracted (select):', extractedValue);
        } else if (valueAny.type === 'status') {
          extractedValue = valueAny.status?.name || '';
          console.log('Extracted (status):', extractedValue);
        } else if (valueAny.type === 'checkbox') {
          extractedValue = valueAny.checkbox ? 'true' : 'false';
          console.log('Extracted (checkbox):', extractedValue);
        } else if (valueAny.type === 'formula') {
          // Handle formula properties - extract the actual value based on formula type
          if (valueAny.formula?.type === 'string') {
            extractedValue = valueAny.formula.string || '';
          } else if (valueAny.formula?.type === 'number') {
            extractedValue = valueAny.formula.number?.toString() || '';
          } else if (valueAny.formula?.type === 'boolean') {
            extractedValue = valueAny.formula.boolean ? 'true' : 'false';
          } else if (valueAny.formula?.type === 'date') {
            extractedValue = valueAny.formula.date?.start || '';
          }
          console.log('Extracted (formula):', extractedValue);
        }
        
        extractedProperties[key] = extractedValue;
      }
    });
    console.log('================================');
  }
  
  console.log('================================');

  console.log('Extracted properties:', extractedProperties);
  console.log('================================');

  // Clean up property names by removing number prefixes and field type indicators
  const cleanedProperties: Record<string, string> = {};
  Object.entries(extractedProperties).forEach(([key, value]) => {
    // Remove patterns like "1.[edit] ", "2.[read] ", "3.[config] " etc.
    const cleanedKey = key.replace(/^\d+\.\[(edit|read|config)\]\s*/, '');
    cleanedProperties[cleanedKey] = value;
  });

  console.log('Cleaned properties:', cleanedProperties);
  console.log('================================');

  let emailSent = false;

  // Check if we have the required data to trigger accreditation email
  if (cleanedProperties.Name && cleanedProperties.Email && cleanedProperties.Accreditation) {
    try {
      console.log('Triggering accreditation email...')
      
      // Call the account API to send the accreditation email
      const response = await fetch(`${process.env.API_BASE_URL}/account/accreditation/email?apiKey=${process.env.DEVCON_API_KEY || ''}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: cleanedProperties.Email,
          name: cleanedProperties.Name,
          accreditationLink: cleanedProperties.Accreditation
        })
      })
      
      if (response.ok) {
        console.log('Accreditation email triggered successfully')
        emailSent = true;
      } else {
        console.error('Failed to trigger accreditation email:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error triggering accreditation email:', error)
    }
  }

  const returnData = {
    success: emailSent,
    message: 'Webhook received successfully',
    timestamp: new Date().toISOString(),
    method,
    extractedProperties: cleanedProperties, // Return cleaned properties
  }     

  return res.status( emailSent ? 200 : 500 ).json(returnData);
}
