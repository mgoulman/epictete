import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, enforce } from '@/lib/auth/supabase-server';

// POST — handle client-direct uploads to Vercel Blob.
// The browser calls @vercel/blob/client `upload()` which exchanges with this
// route to get a short-lived token, then uploads the file *directly* to Blob
// storage. That bypasses the 4.5MB Vercel function payload limit entirely.
export async function POST(request: NextRequest) {
  const denied = await enforce(); if (denied) return denied;
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname /* , clientPayload */) => {
        // Tracking only — don't block uploads on auth here. The /admin
        // pages that reach this route are already gated by middleware.
        const userId = await getCurrentUserId().catch(() => null);

        // Pathname is expected to be `<bucket>/<filename>`.
        const bucket = pathname.split('/')[0];
        const isInvoice = bucket === 'vendor-invoices';
        const allowedContentTypes = isInvoice
          ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf']
          : ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

        return {
          allowedContentTypes,
          // ≈ 20MB for menu images, 10MB for invoices, 5MB otherwise.
          maximumSizeInBytes: bucket === 'menu-images' ? 20 * 1024 * 1024 : isInvoice ? 10 * 1024 * 1024 : 5 * 1024 * 1024,
          tokenPayload: JSON.stringify({ userId, bucket }),
        };
      },
      onUploadCompleted: async () => {
        // Could record an audit log here in the future.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Upload token error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await enforce(); if (denied) return denied;
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url') || searchParams.get('path');
    if (!url) return NextResponse.json({ error: 'No url provided' }, { status: 400 });

    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
