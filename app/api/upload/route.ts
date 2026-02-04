import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use service role for storage operations if available, otherwise use anon key
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);

// Image optimization settings
const IMAGE_MAX_WIDTH = 1920;
const IMAGE_MAX_HEIGHT = 1920;
const IMAGE_QUALITY = 85;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'menu-images';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type — PDF allowed for vendor-invoices bucket
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    const allowedTypes = bucket === 'vendor-invoices'
      ? [...imageTypes, 'application/pdf']
      : imageTypes;
    if (!allowedTypes.includes(file.type)) {
      const typeLabel = bucket === 'vendor-invoices' ? 'JPEG, PNG, WebP, GIF, PDF' : 'JPEG, PNG, WebP, GIF';
      return NextResponse.json({ error: `Invalid file type. Allowed: ${typeLabel}` }, { status: 400 });
    }

    // Validate file size — 20MB for menu-images, 10MB for vendor-invoices, 5MB otherwise
    const maxSize = bucket === 'menu-images' ? 20 * 1024 * 1024 : bucket === 'vendor-invoices' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeLabel = bucket === 'menu-images' ? '20MB' : bucket === 'vendor-invoices' ? '10MB' : '5MB';
      return NextResponse.json({ error: `File too large. Maximum size is ${sizeLabel}` }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);
    let contentType = file.type;
    let ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    // Optimize images (not PDFs)
    if (imageTypes.includes(file.type) && bucket === 'menu-images') {
      try {
        // Get image metadata
        const metadata = await sharp(buffer).metadata();

        // Check if resizing is needed
        const needsResize = (metadata.width && metadata.width > IMAGE_MAX_WIDTH) ||
                           (metadata.height && metadata.height > IMAGE_MAX_HEIGHT);

        // Process image with sharp
        let sharpInstance = sharp(buffer);

        // Resize if too large (maintain aspect ratio)
        if (needsResize) {
          sharpInstance = sharpInstance.resize(IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }

        // Convert HEIC/HEIF to JPEG
        if (file.type === 'image/heic' || file.type === 'image/heif') {
          const optimized = await sharpInstance.jpeg({ quality: IMAGE_QUALITY }).toBuffer();
          buffer = Buffer.from(optimized);
          contentType = 'image/jpeg';
          ext = 'jpg';
        }
        // Optimize JPEG
        else if (file.type === 'image/jpeg') {
          const optimized = await sharpInstance.jpeg({ quality: IMAGE_QUALITY }).toBuffer();
          buffer = Buffer.from(optimized);
        }
        // Optimize PNG
        else if (file.type === 'image/png') {
          const optimized = await sharpInstance.png({ compressionLevel: 8 }).toBuffer();
          buffer = Buffer.from(optimized);
        }
        // Optimize WebP
        else if (file.type === 'image/webp') {
          const optimized = await sharpInstance.webp({ quality: IMAGE_QUALITY }).toBuffer();
          buffer = Buffer.from(optimized);
        }
        // GIFs - just pass through (sharp doesn't handle animated GIFs well)
        else if (file.type === 'image/gif') {
          if (needsResize) {
            const optimized = await sharpInstance.gif().toBuffer();
            buffer = Buffer.from(optimized);
          }
        }

        console.log(`Image optimized: ${file.name} - Original: ${file.size} bytes, Optimized: ${buffer.length} bytes`);
      } catch (sharpError) {
        console.error('Sharp processing error:', sharpError);
        // Continue with original buffer if optimization fails
      }
    }

    // Generate unique filename
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `${filename}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const bucket = searchParams.get('bucket') || 'menu-images';

    if (!path) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
