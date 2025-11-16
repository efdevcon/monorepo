import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_KEY || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

const SupabaseBucket = 'notion';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file, fileName, contentType } = req.body;

    if (!file || !fileName) {
      return res.status(400).json({ error: 'Missing required fields: file and fileName are required' });
    }

    if (!contentType) {
      return res.status(400).json({ 
        error: 'Missing content type',
        details: 'The file type could not be determined. This often happens with HEIC files from iPhones. Please convert to JPEG or PNG first.' 
      });
    }

    // Validate content type - reject unsupported formats
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif', // Modern format, Android 12+ and modern browsers
      'image/bmp',
      'image/tiff',
      'image/svg+xml',
      'application/pdf',
      'text/plain'
    ];

    if (!supportedTypes.includes(contentType)) {
      return res.status(415).json({ 
        error: 'Unsupported file type',
        details: `Content type "${contentType}" is not supported. Please use: JPEG, PNG, GIF, WebP, AVIF, BMP, TIFF, SVG, PDF, or TXT.` 
      });
    }

    console.log('Upload request received:', {
      fileName,
      contentType,
      fileSize: file.length,
      fileSizeMB: (file.length / 1024 / 1024).toFixed(2) + 'MB'
    });

    // Check if file is too large (base64 encoded)
    const maxSizeBytes = 20 * 1024 * 1024; // 20MB original file size
    const base64SizeBytes = file.length;
    const estimatedOriginalSize = Math.floor(base64SizeBytes * 0.75); // Base64 is ~33% larger

    if (estimatedOriginalSize > maxSizeBytes) {
      return res.status(413).json({ 
        error: 'File too large', 
        details: `File size (${(estimatedOriginalSize / 1024 / 1024).toFixed(2)}MB) exceeds the 20MB limit` 
      });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(file.split(',')[1], 'base64');

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFileName = `${timestamp}-${fileName}`;

    console.log('Uploading to Supabase:', {
      uniqueFileName,
      bufferSize: buffer.length,
      bufferSizeMB: (buffer.length / 1024 / 1024).toFixed(2) + 'MB'
    });

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(SupabaseBucket)
      .upload(uniqueFileName, buffer, {
        contentType: contentType,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(SupabaseBucket)
      .getPublicUrl(uniqueFileName);

    console.log('Upload successful:', { publicUrl });

    return res.status(200).json({ 
      success: true, 
      url: publicUrl,
      fileName: uniqueFileName 
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
