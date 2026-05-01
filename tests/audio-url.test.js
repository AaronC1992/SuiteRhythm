import { describe, expect, it } from 'vitest';
import { joinAudioUrlBase, normalizeAudioUrl } from '../lib/modules/audio-url.js';

describe('audio-url helpers', () => {
  it('encodes raw saved-sound paths once', () => {
    expect(normalizeAudioUrl('Saved sounds/car horn.mp3')).toBe('Saved%20sounds/car%20horn.mp3');
  });

  it('keeps already encoded saved-sound paths idempotent', () => {
    expect(normalizeAudioUrl('Saved%20sounds/car%20horn.mp3')).toBe('Saved%20sounds/car%20horn.mp3');
  });

  it('repairs double-encoded saved-sound paths', () => {
    expect(normalizeAudioUrl('Saved%2520sounds/ES_Hardwood,%2520Boots.mp3')).toBe(
      'Saved%20sounds/ES_Hardwood%2C%20Boots.mp3',
    );
  });

  it('preserves query strings on absolute URLs', () => {
    expect(normalizeAudioUrl('https://cdn.example.com/Saved%2520sounds/a%2520b.mp3?sig=a%2Fb')).toBe(
      'https://cdn.example.com/Saved%20sounds/a%20b.mp3?sig=a%2Fb',
    );
  });

  it('joins the R2 proxy without double-encoding path segments', () => {
    expect(joinAudioUrlBase('/r2-audio', 'Saved%2520sounds/footsteps_daytime_hike.mp3')).toBe(
      '/r2-audio/Saved%20sounds/footsteps_daytime_hike.mp3',
    );
  });
});
