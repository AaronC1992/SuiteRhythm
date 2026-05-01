export const CUE_MAP_VERSION = 3;

import { normalizeSoundRecord } from '../sound-catalog.js';

export const RENDERABLE_CUE_TYPES = new Set([
  'sound effect',
  'ambience',
  'music',
  'stinger',
  'intro/outro',
]);

export const CONTROL_CUE_TYPES = new Set(['stop ambience', 'fade music']);

const VALID_CUE_TYPES = new Set([...RENDERABLE_CUE_TYPES, ...CONTROL_CUE_TYPES]);

export function getCueRenderTime(cue) {
  return roundTime(Math.max(0, (Number(cue?.startTime) || 0) + (Number(cue?.offset) || 0)));
}

export function normalizeStudioSound(sound) {
  const { id, type, name, src, tags } = normalizeSoundRecord(sound);
  return { id, type, name, src, tags };
}

export function normalizeCue(cue, index = 0) {
  const cueType = VALID_CUE_TYPES.has(cue?.cueType) ? cue.cueType : 'sound effect';
  const startTime = Math.max(0, Number(cue?.startTime) || 0);
  const offset = Number(cue?.offset) || 0;
  const requestedVolume = Number(cue?.volume);
  const volume = clamp(Number.isFinite(requestedVolume) ? requestedVolume : 0.75, 0, 1);
  const requestedPlaybackRate = Number(cue?.playbackRate);
  const playbackRate = clamp(Number.isFinite(requestedPlaybackRate) ? requestedPlaybackRate : 1, 0.5, 2);
  const normalized = {
    id: String(cue?.id || `cue-${index + 1}`).trim(),
    label: String(cue?.label || cue?.phrase || `Cue ${index + 1}`).trim(),
    phrase: String(cue?.phrase || '').trim(),
    startTime: roundTime(startTime),
    endTime: roundTime(Math.max(startTime, Number(cue?.endTime) || startTime)),
    offset: roundTime(offset),
    renderTime: roundTime(Math.max(0, startTime + offset)),
    cueType,
    soundId: String(cue?.soundId || '').trim(),
    soundName: String(cue?.soundName || '').trim(),
    soundSrc: String(cue?.soundSrc || '').trim(),
    soundCatalogType: String(cue?.soundCatalogType || '').trim(),
    volume,
    fadeIn: roundTime(Math.max(0, Number(cue?.fadeIn) || 0)),
    fadeOut: roundTime(Math.max(0, Number(cue?.fadeOut) || 0)),
    duration: roundTime(Math.max(0, Number(cue?.duration) || 0)),
    trimStart: roundTime(Math.max(0, Number(cue?.trimStart) || 0)),
    repeatMode: cue?.repeatMode === 'loop' ? 'loop' : 'once',
    playbackRate,
    renderable: RENDERABLE_CUE_TYPES.has(cueType),
  };

  if (cue?.soundDataUrl) normalized.soundDataUrl = String(cue.soundDataUrl);
  return normalized;
}

export function buildStudioCueMap({ media, transcriptText = '', transcriptItems = [], cues = [], savedAt = new Date().toISOString() }) {
  const mediaKind = media?.kind === 'video' ? 'video' : 'audio';
  const normalizedCues = cues.map(normalizeCue);
  return {
    version: CUE_MAP_VERSION,
    createdAt: savedAt,
    updatedAt: savedAt,
    media: {
      name: String(media?.name || '').trim(),
      kind: mediaKind,
      duration: roundTime(Number(media?.duration) || 0),
      type: String(media?.file?.type || media?.type || '').trim(),
      size: Number(media?.file?.size || media?.size || 0),
    },
    transcript: {
      text: String(transcriptText || ''),
      items: Array.isArray(transcriptItems) ? transcriptItems : [],
    },
    cues: normalizedCues,
  };
}

export function migrateCueMap(input) {
  const source = input && typeof input === 'object' ? input : {};
  if (source.version === CUE_MAP_VERSION && source.media && source.transcript && Array.isArray(source.cues)) {
    return {
      ...source,
      cues: source.cues.map(normalizeCue),
      version: CUE_MAP_VERSION,
    };
  }

  const savedAt = source.savedAt || source.updatedAt || source.createdAt || new Date().toISOString();
  return buildStudioCueMap({
    media: {
      name: source.mediaName || source.media?.name || '',
      kind: source.mediaKind || source.media?.kind || 'audio',
      duration: source.mediaDuration || source.media?.duration || 0,
      type: source.media?.type || '',
      size: source.media?.size || 0,
    },
    transcriptText: source.transcriptText || source.transcript?.text || '',
    transcriptItems: source.transcriptItems || source.transcript?.items || [],
    cues: Array.isArray(source.cues) ? source.cues : [],
    savedAt,
  });
}

export function validateCueMap(input, options = {}) {
  const cueMap = migrateCueMap(input);
  const errors = [];

  if (!cueMap.media?.kind || !['audio', 'video'].includes(cueMap.media.kind)) {
    errors.push('Cue map media kind must be audio or video.');
  }
  if (!Array.isArray(cueMap.cues)) {
    errors.push('Cue map cues must be an array.');
  }
  if (options.requireCues && !cueMap.cues.length) {
    errors.push('Cue map must contain at least one cue.');
  }

  cueMap.cues.forEach((cue, index) => {
    if (!cue.id) errors.push(`Cue ${index + 1} is missing an id.`);
    if (!cue.phrase) errors.push(`Cue ${index + 1} is missing Cue Words.`);
    if (!VALID_CUE_TYPES.has(cue.cueType)) errors.push(`Cue ${index + 1} has an unsupported cue type.`);
    if (!Number.isFinite(cue.renderTime) || cue.renderTime < 0) errors.push(`Cue ${index + 1} has an invalid render time.`);
    if (cue.renderable && !cue.soundSrc && !cue.soundDataUrl) errors.push(`Cue ${index + 1} is missing a renderable sound source.`);
    if (!Number.isFinite(cue.volume) || cue.volume < 0 || cue.volume > 1) errors.push(`Cue ${index + 1} volume must be between 0 and 1.`);
  });

  return { valid: errors.length === 0, cueMap, errors };
}

export function getRenderableCues(cueMap) {
  return migrateCueMap(cueMap)
    .cues
    .filter((cue) => cue.renderable && (cue.soundSrc || cue.soundDataUrl))
    .sort((a, b) => a.renderTime - b.renderTime);
}

export function buildFallbackTranscript(text, duration) {
  const clean = String(text || '').trim();
  if (!clean) return [];
  const words = clean.match(/[\w'-]+|[^\s\w]/g) || [];
  const totalDuration = duration || Math.max(4, words.length * 0.42);
  const step = totalDuration / Math.max(1, words.length);
  return words.map((word, index) => ({
    id: `manual-${index}`,
    text: word,
    start: roundTime(index * step),
    end: roundTime((index + 1) * step),
    type: 'word',
  }));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundTime(value) {
  return Number((Number(value) || 0).toFixed(2));
}