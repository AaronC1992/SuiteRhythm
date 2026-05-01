import { describe, expect, it } from 'vitest';
import corpus from './fixtures/sound-matching-corpus.json' with { type: 'json' };
import { buildCatalogSummary } from '../lib/server-catalog.js';
import { buildTriggerMap, ruleBasedDecision } from '../lib/modules/trigger-system.js';

const triggerMap = buildTriggerMap({ files: [] });
const savedSounds = { files: [] };

function getSfxList(summary) {
  return summary.match(/AVAILABLE SFX CANDIDATES \(\d+ sounds[^\n]*\):\n([^\n]*)/)?.[1] || '';
}

describe('sound matching evaluation corpus', () => {
  for (const example of corpus) {
    it(example.name, () => {
      if (example.summaryContains || example.summaryExcludes) {
        const summary = buildCatalogSummary({ transcript: example.transcript, mode: example.mode });
        const sfxList = getSfxList(summary);

        for (const soundName of example.summaryContains || []) {
          expect(sfxList).toContain(soundName);
        }
        for (const soundName of example.summaryExcludes || []) {
          expect(sfxList).not.toContain(soundName);
        }
      }

      if (example.ruleSfxQueries) {
        const decision = ruleBasedDecision(example.transcript, example.mode, triggerMap, savedSounds);
        const queries = decision?.sfx?.map((sfx) => sfx.query) || [];
        expect(queries).toEqual(example.ruleSfxQueries);
      }
    });
  }
});
