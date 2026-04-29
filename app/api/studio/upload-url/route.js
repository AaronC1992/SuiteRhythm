import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/api-auth.js';
import { checkRateLimit, rateLimitHeaders } from '../../../../lib/rate-limit.js';
import { getPresignedUploadUrl, hasR2Config } from '../../../../lib/r2.js';

export const runtime = 'nodejs';

const MB = 1024 * 1024;
const MAX_UPLOAD_MB = Number(process.env.STUDIO_TRANSCRIBE_UPLOAD_MAX_FILE_MB || 100);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * MB;
const ALLOWED_EXTENSIONS = /\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|ogg)$/i;

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const rate = checkRateLimit(request, {
    namespace: 'studio-upload-url',
    limit: 10,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Upload rate limit exceeded. Try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rate) }
    );
  }

  if (!hasR2Config()) {
    return NextResponse.json(
      { error: 'Large Studio transcription uploads require R2 storage to be configured.' },
      { status: 503, headers: rateLimitHeaders(rate) }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400, headers: rateLimitHeaders(rate) });
  }

  const fileName = String(body?.fileName || 'studio-media').trim();
  const contentType = String(body?.contentType || 'application/octet-stream').trim();
  const size = Number(body?.size) || 0;

  if (size <= 0) {
    return NextResponse.json({ error: 'file size is required' }, { status: 400, headers: rateLimitHeaders(rate) });
  }
  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `file exceeds ${MAX_UPLOAD_MB} MB transcription upload limit` }, { status: 413, headers: rateLimitHeaders(rate) });
  }
  if (!contentType.startsWith('audio/') && !contentType.startsWith('video/') && !ALLOWED_EXTENSIONS.test(fileName)) {
    return NextResponse.json({ error: 'unsupported media type' }, { status: 415, headers: rateLimitHeaders(rate) });
  }

  const key = `studio-transcribe/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
  const expiresIn = 15 * 60;
  const uploadUrl = await getPresignedUploadUrl(key, contentType, expiresIn);

  return NextResponse.json({
    key,
    uploadUrl,
    expiresIn,
    headers: { 'Content-Type': contentType },
    maxFileMb: MAX_UPLOAD_MB,
  }, { headers: rateLimitHeaders(rate) });
}

function sanitizeFileName(name) {
  return String(name)
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'studio-media';
}