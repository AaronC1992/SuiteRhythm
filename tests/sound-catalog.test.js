import { describe, expect, it } from 'vitest';
import {
  normalizeSavedSoundForSearch,
  normalizeSoundForApi,
  normalizeSoundRecord,
  normalizeSoundType,
} from '../lib/sound-catalog.js';

describe('sound catalog normalization', () => {
  it('preserves ambience as its own sound type', () => {
    expect(normalizeSoundType('ambience')).toBe('ambience');
    expect(normalizeSoundType('ambient')).toBe('ambience');
  });

  it('falls back unknown sound types to sfx', () => {
    expect(normalizeSoundType('music')).toBe('music');
    expect(normalizeSoundType('')).toBe('sfx');
    expect(normalizeSoundType('voice')).toBe('sfx');
  });

  it('normalizes static, API, and studio sound records into the client catalog shape', () => {
    expect(normalizeSoundRecord({ type: 'ambience', name: 'Rain Room', file: 'rain.mp3', keywords: ['rain'] })).toEqual({
      id: 'rain.mp3',
      type: 'ambience',
      name: 'Rain Room',
      src: 'rain.mp3',
      tags: ['rain'],
      loop: true,
    });

    expect(normalizeSoundRecord({ type: 'sfx', src: 'hit.wav', tags: ['impact'] })).toMatchObject({
      id: 'hit.wav',
      type: 'sfx',
      name: 'hit.wav',
      src: 'hit.wav',
      tags: ['impact'],
      loop: false,
    });
  });

  it('normalizes API and local-search catalog shapes from the same source rules', () => {
    const source = { type: 'ambient', name: 'Forest Night', src: 'forest.mp3', tags: ['Forest', 'Night'] };

    expect(normalizeSoundForApi(source)).toEqual({
      type: 'ambience',
      name: 'Forest Night',
      file: 'forest.mp3',
      keywords: ['Forest', 'Night'],
      loop: true,
    });

    expect(normalizeSavedSoundForSearch(source)).toEqual({
      type: 'ambience',
      name: 'forest night',
      file: 'forest.mp3',
      keywords: ['forest', 'night'],
    });
  });
});
