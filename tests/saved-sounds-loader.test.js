import { describe, expect, it, vi } from 'vitest';
import { loadSavedSoundsCatalog } from '../lib/modules/saved-sounds-loader.js';

describe('saved sounds loader', () => {
  it('loads and normalizes static saved sounds for local matching', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        files: [
          { type: 'ambience', name: 'Rain Room', file: 'rain.mp3', keywords: ['Rain', 'Room'] },
        ],
      }),
    }));

    await expect(loadSavedSoundsCatalog({ fetchImpl })).resolves.toEqual([
      { type: 'ambience', name: 'rain room', file: 'rain.mp3', keywords: ['rain', 'room'] },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith('/saved-sounds.json', { cache: 'no-cache' });
  });

  it('returns an empty catalog when the static file is unavailable', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false }));

    await expect(loadSavedSoundsCatalog({ fetchImpl })).resolves.toEqual([]);
  });
});
