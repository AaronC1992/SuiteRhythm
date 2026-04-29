import { NextResponse } from 'next/server';
import { File } from 'buffer';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import OpenAI from 'openai';
import os from 'os';
import path from 'path';
import { requireAuth } from '../../../lib/api-auth.js';
import { checkRateLimit, rateLimitHeaders } from '../../../lib/rate-limit.js';
import { deleteFile, downloadFileBuffer } from '../../../lib/r2.js';
import { getFfmpegBinaryPath } from '../../../lib/studio/render.js';

export const runtime = 'nodejs';

const MB = 1024 * 1024;
const OPENAI_MAX_FILE_SIZE = Number(process.env.OPENAI_TRANSCRIBE_MAX_FILE_MB || 25) * MB;
const MAX_SOURCE_FILE_SIZE = Number(process.env.STUDIO_TRANSCRIBE_UPLOAD_MAX_FILE_MB || 100) * MB;
const TRANSCRIBE_BITRATE = process.env.STUDIO_TRANSCRIBE_AUDIO_BITRATE || '64k';
const ALLOWED_EXTENSIONS = /\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|ogg)$/i;

let openai;
function getOpenAI() {
  return (openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
}

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI transcription is not configured' }, { status: 503 });
  }

  const rate = checkRateLimit(request, {
    namespace: 'transcribe',
    limit: 8,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rate) }
    );
  }

  let source;
  try {
    source = await readTranscriptionSource(request);
    validateTranscriptionFile(source.file);
    const fileForOpenAI = await prepareFileForTranscription(source.file);
    const transcription = await createTranscription(fileForOpenAI);
    const normalized = normalizeTranscription(transcription, source.duration);
    const res = NextResponse.json(normalized);
    res.headers.set('X-RateLimit-Remaining', String(rate.remaining));
    return res;
  } catch (err) {
    console.error('[/api/transcribe]', err);
    return NextResponse.json(
      { error: err?.message || 'Transcription failed' },
      { status: err?.status || 500, headers: rateLimitHeaders(rate) }
    );
  } finally {
    await source?.cleanup?.();
  }
}

async function readTranscriptionSource(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    let body;
    try {
      body = await request.json();
    } catch {
      throw new HttpError('Expected valid JSON body', 400);
    }

    const uploadKey = String(body?.uploadKey || '').trim();
    if (!uploadKey.startsWith('studio-transcribe/')) {
      throw new HttpError('Invalid staged upload key', 400);
    }

    const buffer = await downloadFileBuffer(uploadKey);
    const file = new File([buffer], String(body?.fileName || 'studio-media'), {
      type: String(body?.contentType || 'application/octet-stream'),
    });

    return {
      file,
      duration: Number(body?.duration) || 0,
      cleanup: () => deleteFile(uploadKey).catch((err) => console.warn('Temporary transcription upload cleanup failed:', err?.message || err)),
    };
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    throw new HttpError('Expected multipart form data', 400);
  }

  const file = formData.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new HttpError('file is required', 400);
  }
  return { file, duration: Number(formData.get('duration')) || 0 };
}

function validateTranscriptionFile(file) {
  if (file.size > MAX_SOURCE_FILE_SIZE) {
    throw new HttpError(`file exceeds ${Math.round(MAX_SOURCE_FILE_SIZE / MB)} MB transcription upload limit`, 413);
  }
  if (!file.type?.startsWith('audio/') && !file.type?.startsWith('video/') && !ALLOWED_EXTENSIONS.test(file.name || '')) {
    throw new HttpError('unsupported media type', 415);
  }
}

async function prepareFileForTranscription(file) {
  if (file.size <= OPENAI_MAX_FILE_SIZE && !isVideoMedia(file)) return file;

  const converted = await transcodeToOpenAIAudio(file);
  if (converted.size > OPENAI_MAX_FILE_SIZE) {
    throw new HttpError(`audio is still larger than ${Math.round(OPENAI_MAX_FILE_SIZE / MB)} MB after compression`, 413);
  }
  return converted;
}

function isVideoMedia(file) {
  return file.type?.startsWith('video/') || (!file.type?.startsWith('audio/') && /\.(mp4|webm)$/i.test(file.name || ''));
}

async function transcodeToOpenAIAudio(file) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'suiterhythm-transcribe-'));
  try {
    const inputPath = path.join(tempDir, `source${extensionFromName(file.name) || extensionFromType(file.type) || '.media'}`);
    const outputPath = path.join(tempDir, 'transcribe.mp3');
    await fs.writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    await runFfmpeg([
      '-y',
      '-i', inputPath,
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      '-b:a', TRANSCRIBE_BITRATE,
      outputPath,
    ]);
    const buffer = await fs.readFile(outputPath);
    return new File([buffer], `${sanitizeBaseName(file.name || 'studio-media')}.mp3`, { type: 'audio/mpeg' });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(getFfmpegBinaryPath(), args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 6000) stderr = stderr.slice(-6000);
    });
    child.on('error', (err) => reject(new HttpError(`ffmpeg could not start: ${err.message}`, 500)));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new HttpError(`Could not prepare audio for transcription.${stderr ? ` ${stderr}` : ''}`, 500));
    });
  });
}

async function createTranscription(file) {
  const model = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';
  const client = getOpenAI();
  const verboseParams = {
    file,
    model,
    response_format: 'verbose_json',
    timestamp_granularities: ['word', 'segment'],
  };

  try {
    return await client.audio.transcriptions.create(verboseParams);
  } catch (firstErr) {
    try {
      const { timestamp_granularities: _unused, ...withoutGranularity } = verboseParams;
      return await client.audio.transcriptions.create(withoutGranularity);
    } catch (_) {
      if (!String(firstErr?.message || '').toLowerCase().includes('timestamp')) throw firstErr;
      return client.audio.transcriptions.create({ file, model });
    }
  }
}

function normalizeTranscription(raw, uploadedDuration) {
  const text = String(raw?.text || '').trim();
  const duration = Number(raw?.duration) || uploadedDuration || estimateDuration(text);
  const words = normalizeWords(raw?.words);
  if (words.length) {
    return { text, words, phrases: buildPhrasesFromWords(words), timestampLevel: 'word', source: 'openai' };
  }

  const segments = normalizeSegments(raw?.segments);
  if (segments.length) {
    return { text, words: segments, phrases: segments, timestampLevel: 'phrase', source: 'openai' };
  }

  const estimated = buildEstimatedWords(text, duration);
  return { text, words: estimated, phrases: buildPhrasesFromWords(estimated), timestampLevel: 'estimated', source: 'openai' };
}

function normalizeWords(words) {
  if (!Array.isArray(words)) return [];
  return words
    .map((word, index) => ({
      id: `word-${index}`,
      text: String(word.word || word.text || '').trim(),
      start: roundTime(word.start),
      end: roundTime(word.end),
      type: 'word',
    }))
    .filter((word) => word.text);
}

function normalizeSegments(segments) {
  if (!Array.isArray(segments)) return [];
  return segments
    .map((segment, index) => ({
      id: `phrase-${index}`,
      text: String(segment.text || '').trim(),
      start: roundTime(segment.start),
      end: roundTime(segment.end),
      type: 'phrase',
    }))
    .filter((segment) => segment.text);
}

function buildEstimatedWords(text, duration) {
  const tokens = text.match(/[\w'-]+|[^\s\w]/g) || [];
  if (!tokens.length) return [];
  const step = duration / tokens.length;
  return tokens.map((token, index) => ({
    id: `estimated-${index}`,
    text: token,
    start: roundTime(index * step),
    end: roundTime((index + 1) * step),
    type: 'word',
  }));
}

function buildPhrasesFromWords(words) {
  const phrases = [];
  for (let index = 0; index < words.length; index += 10) {
    const chunk = words.slice(index, index + 10);
    if (!chunk.length) continue;
    phrases.push({
      id: `phrase-${phrases.length}`,
      text: chunk.map((word) => word.text).join(' ').replace(/\s+([,.!?;:])/g, '$1'),
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      type: 'phrase',
    });
  }
  return phrases;
}

function estimateDuration(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(4, words * 0.45);
}

function roundTime(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function extensionFromName(name = '') {
  const ext = path.extname(String(name).split('?')[0]).toLowerCase();
  return ext && ext.length <= 8 ? ext : '';
}

function extensionFromType(type = '') {
  const normalized = type.split(';')[0].trim().toLowerCase();
  const map = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
  };
  return map[normalized] || '';
}

function sanitizeBaseName(name) {
  return String(name)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'studio-media';
}

class HttpError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}
