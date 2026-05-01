import { normalizeSavedSoundForSearch } from '../sound-catalog.js';

export async function loadSavedSoundsCatalog({ fetchImpl = globalThis.fetch, path = '/saved-sounds.json' } = {}) {
  if (typeof fetchImpl !== 'function') return [];

  const response = await fetchImpl(path, { cache: 'no-cache' });
  if (!response?.ok) return [];

  const data = await response.json();
  return Array.isArray(data?.files) ? data.files.map(normalizeSavedSoundForSearch) : [];
}
