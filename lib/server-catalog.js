import fs from 'fs';
import path from 'path';

let staticSoundsCache = null;
let staticStoriesCache = null;

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'onto', 'over', 'under',
  'then', 'than', 'they', 'them', 'their', 'there', 'here', 'have', 'has', 'had',
  'was', 'were', 'are', 'is', 'you', 'your', 'but', 'not', 'all', 'out', 'our',
  'she', 'his', 'her', 'him', 'who', 'what', 'when', 'where', 'why', 'how', 'can',
  'will', 'would', 'could', 'should', 'about', 'after', 'before', 'through', 'around',
]);

export function getStaticSoundFiles() {
  if (staticSoundsCache) return staticSoundsCache;
  const filePath = path.join(process.cwd(), 'public', 'saved-sounds.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  staticSoundsCache = Array.isArray(data?.files) ? data.files : [];
  return staticSoundsCache;
}

export function getStaticStories() {
  if (staticStoriesCache) return staticStoriesCache;
  const filePath = path.join(process.cwd(), 'public', 'stories.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  staticStoriesCache = Array.isArray(data?.stories) ? data.stories : [];
  return staticStoriesCache;
}

export function normalizeSoundForApi(sound) {
  const type = sound?.type === 'music' ? 'music'
    : sound?.type === 'ambience' ? 'ambience'
    : 'sfx';

  return {
    type,
    name: String(sound?.name || sound?.file || '').trim(),
    file: String(sound?.file || '').trim(),
    keywords: Array.isArray(sound?.keywords) ? sound.keywords : [],
    loop: type === 'music' || type === 'ambience' || !!sound?.loop,
  };
}

export function getStaticSoundsForApi() {
  return getStaticSoundFiles().map(normalizeSoundForApi);
}

export function getStaticStoriesForApi() {
  return getStaticStories().map((story) => ({
    id: story.id,
    title: story.title,
    theme: story.theme || '',
    description: story.description || '',
    text: story.text || story.body || '',
    demo: !!story.demo,
  }));
}

export function buildCatalogSummary({ transcript = '', mode = 'auto', context = null } = {}) {
  const files = getStaticSoundFiles();
  const terms = collectTerms(transcript, mode, context);
  const music = selectCandidates(files, terms, 'music', 30);
  const sfx = selectCandidates(files, terms, 'sfx', 70);

  const musicLines = music.map((sound) => {
    const keywords = (sound.keywords || []).slice(0, 5).join(', ');
    return `${sound.name}${keywords ? ` [${keywords}]` : ''}`;
  });
  const sfxLines = sfx.map((sound) => sound.name);

  return `\nAVAILABLE MUSIC CANDIDATES (${musicLines.length} tracks - pick by exact name):\n${musicLines.join(' | ')}\n\nAVAILABLE SFX CANDIDATES (${sfxLines.length} sounds - pick by exact name):\n${sfxLines.join(' | ')}`;
}

function collectTerms(transcript, mode, context) {
  const textParts = [transcript, mode];
  if (context && typeof context === 'object') {
    textParts.push(
      context.sceneState,
      context.sceneMemory,
      context.sessionContext,
      context.newSpeech,
      context.storyTitle,
      context.singGenre,
      context.worldState?.location,
      context.worldState?.weather,
      context.worldState?.timeOfDay,
    );
    if (Array.isArray(context.recentSounds)) textParts.push(context.recentSounds.join(' '));
  }

  const terms = new Set();
  String(textParts.filter(Boolean).join(' '))
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .forEach((term) => {
      if (term.length >= 3 && !STOP_WORDS.has(term)) terms.add(term);
    });
  return terms;
}

function selectCandidates(files, terms, type, limit) {
  const family = type === 'music'
    ? (sound) => sound.type === 'music'
    : (sound) => sound.type !== 'music';

  const scored = files
    .filter(family)
    .map((sound, index) => ({ sound, index, score: scoreSound(sound, terms) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const matches = scored.filter((item) => item.score > 0).slice(0, limit);
  if (matches.length >= Math.min(12, limit)) return matches.map((item) => item.sound);

  const seen = new Set(matches.map((item) => item.sound.name));
  for (const item of scored) {
    if (matches.length >= limit) break;
    if (seen.has(item.sound.name)) continue;
    matches.push(item);
    seen.add(item.sound.name);
  }

  return matches.map((item) => item.sound);
}

function scoreSound(sound, terms) {
  if (!terms.size) return 0;
  const name = String(sound.name || '').toLowerCase();
  const nameWords = new Set(name.split(/[^a-z0-9']+/).filter(Boolean));
  const keywords = new Set((sound.keywords || []).map((kw) => String(kw).toLowerCase()));
  const haystack = `${name} ${Array.from(keywords).join(' ')}`;
  let score = 0;

  for (const term of terms) {
    if (keywords.has(term)) score += 8;
    if (nameWords.has(term)) score += 6;
    else if (name.includes(term)) score += 3;
    else if (haystack.includes(term)) score += 1;
  }

  if (sound.type === 'ambience' && (terms.has('rain') || terms.has('storm') || terms.has('forest') || terms.has('tavern'))) {
    score += 4;
  }

  return score;
}
