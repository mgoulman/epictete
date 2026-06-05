import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import sharp from 'sharp';

// Image optimization settings
const IMAGE_MAX_WIDTH = 1920;
const IMAGE_MAX_HEIGHT = 1920;
const IMAGE_QUALITY = 85;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = (formData.get('bucket') as string) || 'menu-images';

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
    let buffer = Buffer.from(arrayBuffer) as Buffer;
    let contentType = file.type;
    let ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    // Optimize images (not PDFs)
    if (imageTypes.includes(file.type) && bucket === 'menu-images') {
      try {
        const metadata = await sharp(buffer).metadata();
        const needsResize = (metadata.width && metadata.width > IMAGE_MAX_WIDTH) ||
                           (metadata.height && metadata.height > IMAGE_MAX_HEIGHT);

        let sharpInstance = sharp(buffer);
        if (needsResize) {
          sharpInstance = sharpInstance.resize(IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }

        if (file.type === 'image/heic' || file.type === 'image/heif') {
          buffer = Buffer.from(await sharpInstance.jpeg({ quality: IMAGE_QUALITY }).toBuffer()) as Buffer;
          contentType = 'image/jpeg';
          ext = 'jpg';
        } else if (file.type === 'image/jpeg') {
          buffer = Buffer.from(await sharpInstance.jpeg({ quality: IMAGE_QUALITY }).toBuffer()) as Buffer;
        } else if (file.type === 'image/png') {
          buffer = Buffer.from(await sharpInstance.png({ compressionLevel: 8 }).toBuffer()) as Buffer;
        } else if (file.type === 'image/webp') {
          buffer = Buffer.from(await sharpInstance.webp({ quality: IMAGE_QUALITY }).toBuffer()) as Buffer;
        } else if (file.type === 'image/gif' && needsResize) {
          buffer = Buffer.from(await sharpInstance.gif().toBuffer()) as Buffer;
        }

        console.log(`Image optimized: ${file.name} - Original: ${file.size} bytes, Optimized: ${buffer.length} bytes`);
      } catch (sharpError) {
        console.error('Sharp processing error:', sharpError);
        // Continue with original buffer if optimization fails
      }
    }

    // Generate unique filename — namespaced by bucket so we keep logical folders
    const filename = `${bucket}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      path: blob.pathname,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Vercel Blob deletes by URL, not by path. Accept either for compatibility.
    const url = searchParams.get('url') || searchParams.get('path');

    if (!url) {
      return NextResponse.json({ error: 'No url provided' }, { status: 400 });
    }

    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    const msg = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
