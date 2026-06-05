'use client';

import { upload } from '@vercel/blob/client';

const MAX_IMAGE_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;
const COMPRESSION_THRESHOLD = 1_500_000; // 1.5MB — anything bigger gets re-encoded

/**
 * Resize / re-encode an image in the browser before upload.
 * Skips files that are already small enough, or non-image content (PDF).
 */
async function compressIfImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif') return file; // sharp-style preservation; keep as-is
  if (file.size < COMPRESSION_THRESHOLD) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a file to Vercel Blob via a client-direct upload.
 * `bucket` namespaces the file (e.g. 'menu-images', 'vendor-invoices').
 * Bypasses the Vercel function 4.5MB payload limit.
 */
export async function uploadFile(file: File, bucket: string = 'menu-images'): Promise<UploadResult> {
  const compressed = await compressIfImage(file);
  const ext = compressed.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${bucket}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const blob = await upload(filename, compressed, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    contentType: compressed.type,
  });

  return { url: blob.url, path: blob.pathname };
}
