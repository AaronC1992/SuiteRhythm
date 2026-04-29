import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/api-auth.js';
import { checkRateLimit, rateLimitHeaders } from '../../../../lib/rate-limit.js';
import { renderStudioMedia } from '../../../../lib/studio/render.js';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_RENDER_FILE_SIZE = Number(process.env.STUDIO_RENDER_MAX_FILE_MB || 100) * 1024 * 1024;
const SUPPORTED_MEDIA_EXTENSIONS = /\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|ogg)$/i;

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const rate = checkRateLimit(request, {
    namespace: 'studio-render',
    limit: 6,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Render rate limit exceeded. Try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rate) }
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const mediaFile = formData.get('media');
  const cueMapRaw = formData.get('cueMap');
  const outputType = formData.get('outputType') === 'video' ? 'video' : 'audio';
  const outputFormat = formData.get('outputFormat') === 'mp3' ? 'mp3' : 'wav';

  if (!mediaFile || typeof mediaFile.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'media file is required' }, { status: 400 });
  }
  if (mediaFile.size > MAX_RENDER_FILE_SIZE) {
    return NextResponse.json({ error: `media file exceeds ${Math.round(MAX_RENDER_FILE_SIZE / 1024 / 1024)} MB limit` }, { status: 413 });
  }
  if (!mediaFile.type?.startsWith('audio/') && !mediaFile.type?.startsWith('video/') && !SUPPORTED_MEDIA_EXTENSIONS.test(mediaFile.name || '')) {
    return NextResponse.json({ error: 'unsupported media type' }, { status: 415 });
  }
  if (outputType === 'video' && !mediaFile.type?.startsWith('video/') && !/\.(mp4|webm)$/i.test(mediaFile.name || '')) {
    return NextResponse.json({ error: 'video render requires a video source file' }, { status: 400 });
  }

  let cueMap;
  try {
    cueMap = JSON.parse(String(cueMapRaw || ''));
  } catch {
    return NextResponse.json({ error: 'cueMap must be valid JSON' }, { status: 400 });
  }

  try {
    const rendered = await renderStudioMedia({ mediaFile, cueMap, outputType, outputFormat });
    return new Response(rendered.buffer, {
      status: 200,
      headers: {
        'Content-Type': rendered.contentType,
        'Content-Disposition': `attachment; filename="${rendered.fileName}"`,
        'Cache-Control': 'no-store',
        'X-RateLimit-Remaining': String(rate.remaining),
      },
    });
  } catch (err) {
    console.error('[/api/studio/render]', err);
    return NextResponse.json(
      { error: err?.message || 'Render failed' },
      { status: err?.status || 500, headers: rateLimitHeaders(rate) }
    );
  }
}