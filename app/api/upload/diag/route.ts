import { NextResponse } from 'next/server';

// Diagnostic endpoint to verify what the deployed function actually sees for
// Vercel Blob env vars. Returns presence + length only — never the secret.
export async function GET() {
  const blob = process.env.BLOB_READ_WRITE_TOKEN;
  const webhook = process.env.BLOB_WEBHOOK_PUBLIC_KEY;
  const storeId = process.env.BLOB_STORE_ID;
  return NextResponse.json({
    BLOB_READ_WRITE_TOKEN: blob
      ? { present: true, length: blob.length, startsWith: blob.slice(0, 20) }
      : { present: false },
    BLOB_WEBHOOK_PUBLIC_KEY: { present: !!webhook },
    BLOB_STORE_ID: { present: !!storeId },
    VERCEL_ENV: process.env.VERCEL_ENV || null,
    VERCEL_REGION: process.env.VERCEL_REGION || null,
    deployedAt: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
  });
}
