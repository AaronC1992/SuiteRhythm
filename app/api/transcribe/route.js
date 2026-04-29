import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '../../../lib/api-auth.js';
import { checkRateLimit, rateLimitHeaders } from '../../../lib/rate-limit.js';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
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

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const duration = Number(formData.get('duration')) || 0;
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'file exceeds 25 MB limit' }, { status: 413 });
  }
  if (!file.type?.startsWith('audio/') && !file.type?.startsWith('video/') && !ALLOWED_EXTENSIONS.test(file.name || '')) {
    return NextResponse.json({ error: 'unsupported media type' }, { status: 415 });
  }

  try {
    const transcription = await createTranscription(file);
    const normalized = normalizeTranscription(transcription, duration);
    const res = NextResponse.json(normalized);
    res.headers.set('X-RateLimit-Remaining', String(rate.remaining));
    return res;
  } catch (err) {
    console.error('[/api/transcribe]', err);
    return NextResponse.json(
      { error: err?.message || 'Transcription failed' },
      { status: err?.status || 500, headers: rateLimitHeaders(rate) }
    );
  }
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
