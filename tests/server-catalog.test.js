import { describe, it, expect } from 'vitest';
import { buildCatalogSummary, getStaticSoundsForApi, getStaticStoriesForApi } from '../lib/server-catalog.js';

describe('server-catalog', () => {
    it('loads normalized static sounds and stories', () => {
        const sounds = getStaticSoundsForApi();
        const stories = getStaticStoriesForApi();

        expect(sounds.length).toBeGreaterThan(0);
        expect(sounds[0]).toHaveProperty('file');
        expect(sounds[0]).toHaveProperty('keywords');
        expect(stories.length).toBeGreaterThan(0);
        expect(stories[0]).toHaveProperty('text');
    });

    it('builds a bounded candidate list instead of the full catalog', () => {
        const summary = buildCatalogSummary({
            transcript: 'The party enters a rainy tavern before a stormy battle',
            mode: 'dnd',
        });
        const musicList = summary.match(/AVAILABLE MUSIC CANDIDATES \(\d+ tracks[^\n]*\):\n([^\n]*)/)?.[1] || '';
        const sfxList = summary.match(/AVAILABLE SFX CANDIDATES \(\d+ sounds[^\n]*\):\n([^\n]*)/)?.[1] || '';

        expect(musicList.split(' | ').filter(Boolean).length).toBeLessThanOrEqual(30);
        expect(sfxList.split(' | ').filter(Boolean).length).toBeLessThanOrEqual(70);
        expect(summary.length).toBeLessThan(12000);
    });
});
