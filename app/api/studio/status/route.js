import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/api-auth.js';
import { hasR2Config } from '../../../../lib/r2.js';
import { getFfmpegBinaryPath } from '../../../../lib/studio/render.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  return NextResponse.json({
    transcription: {
      configured: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1',
      directUploadMaxFileMb: Number(process.env.STUDIO_DIRECT_TRANSCRIBE_MAX_FILE_MB || 4),
      maxFileMb: Number(process.env.STUDIO_TRANSCRIBE_UPLOAD_MAX_FILE_MB || 100),
      openAiMaxFileMb: Number(process.env.OPENAI_TRANSCRIBE_MAX_FILE_MB || 25),
      stagedUploadConfigured: hasR2Config(),
    },
    render: {
      configured: Boolean(getFfmpegBinaryPath()),
      binary: process.env.FFMPEG_PATH ? 'env' : 'bundled',
      maxFileMb: Number(process.env.STUDIO_RENDER_MAX_FILE_MB || 100),
      timeoutMs: Number(process.env.STUDIO_RENDER_TIMEOUT_MS || 120_000),
    },
    storage: {
      r2Configured: hasR2Config(),
      r2PublicUrlConfigured: Boolean(process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL),
    },
  });
}