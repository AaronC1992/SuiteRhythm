import { describe, it, expect } from 'vitest';
import { buildTriggerMap, ruleBasedDecision, shouldTriggerKeyword, tfidfMatch } from '../lib/modules/trigger-system.js';

const triggerMap = buildTriggerMap({ files: [] });

describe('trigger-system matching precision', () => {
    it('does not fire animal nouns without sound evidence', () => {
        expect(shouldTriggerKeyword('dog', 'The dog slept beside the chair.')).toBe(false);
        expect(shouldTriggerKeyword('bird', 'A bird crossed the window.')).toBe(false);
        expect(shouldTriggerKeyword('horse', 'The horse stood in the stable.')).toBe(false);
    });

    it('allows animal nouns when the sentence describes the sound', () => {
        expect(shouldTriggerKeyword('dog', 'The dog barked loudly.')).toBe(true);
        expect(shouldTriggerKeyword('bird', 'The birds were chirping outside.')).toBe(true);
        expect(shouldTriggerKeyword('horse', 'The horse galloped down the road.')).toBe(true);
    });

    it('does not treat figurative or visual mentions as instant SFX', () => {
        expect(shouldTriggerKeyword('shot', 'He shot a look across the room.')).toBe(false);
        expect(shouldTriggerKeyword('fire', 'She had to fire the assistant.')).toBe(false);
        expect(shouldTriggerKeyword('cast', 'The statue cast a long shadow.')).toBe(false);
    });

    it('keeps auto-mode rule-based fallback silent without transcript evidence', () => {
        const savedSounds = {
            files: [
                { type: 'music', name: 'ambient atmosphere', file: 'ambient.mp3', keywords: ['ambient', 'calm'] },
            ],
        };

        expect(ruleBasedDecision('He reads a newspaper at the table.', 'auto', triggerMap, savedSounds)).toBeNull();
    });

    it('lets clear sound actions through the rule-based fallback', () => {
        const decision = ruleBasedDecision('The dog barked at the door.', 'auto', triggerMap, { files: [] });

        expect(decision?.sfx.map((sfx) => sfx.query)).toContain('dog bark');
    });

    it('can explicitly match ambience without mixing it into normal SFX search', () => {
        const files = [
            { type: 'ambience', name: 'forest ambience daytime', file: 'forest.mp3', keywords: ['forest', 'birds', 'ambient'] },
            { type: 'sfx', name: 'bird whistling chirping', file: 'bird.mp3', keywords: ['bird', 'chirping'] },
        ];

        expect(tfidfMatch('forest birds ambient', 'ambience', files)?.file).toBe('forest.mp3');
        expect(tfidfMatch('forest birds ambient', 'sfx', files)).toBeNull();
    });
});
