#!/usr/bin/env node
/**
 * Catalog retagger.
 *
 * Applies a deterministic pass over `public/saved-sounds.json` to:
 *   1. Normalize keywords (lowercase + dedupe + trim).
 *   2. Reclassify clear-ambience entries from type=sfx → type=ambience,
 *      mark them loop:true, and ensure the 'ambience' + 'ambient' tags
 *      are present.
 *   3. Sprinkle in genre tags (fantasy / horror / tavern / christmas /
 *      halloween / scifi) based on name + keyword signals so the
 *      engine's mood/scene matcher actually has something to score.
 *
 * The heuristics are intentionally conservative — better to miss a
 * borderline case than to flip a one-shot hit like "cave monster roar"
 * into a looping bed. Run with:
 *
 *     node scripts/retag-catalog.js            # dry-run summary
 *     node scripts/retag-catalog.js --write    # overwrite saved-sounds.json
 *     node scripts/retag-catalog.js --check    # exit 1 if catalog would change (CI drift check)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.resolve(__dirname, '..', 'public', 'saved-sounds.json');

// -------- heuristics --------

// An entry is ambience if its NAME matches any of these patterns and its
// current type is sfx (we never demote explicit music entries).
const AMBIENCE_NAME_RE = new RegExp([
    '\\b(ambience|ambient)\\b',
    '\\broom tone\\b',
    '\\bfireplace\\b',
    '\\bcampfire\\b',
    '\\bcrickets?\\b',
    '\\bforest\\s+(day|night|morning|afternoon|evening)\\b',
    '\\btavern\\s+(inside|background|ambien)',
    '\\b(underwater|swamp|jungle|sewer|dungeon|saloon|mountain|ocean|rainy)\\s+(ambience|ambient)',
    '\\b(wind|rain)\\s+(bed|loop|ambient|ambience|background)',
].join('|'), 'i');

// Genre inference: (tag → regex on name+keywords joined).
const GENRE_RULES = [
    { tag: 'fantasy',   re: /\b(medieval|fantasy|rpg|knight|wizard|dragon|sword|castle|dungeon|elf|dwarf|goblin|orc|tavern|bard)\b/i },
    { tag: 'horror',    re: /\b(horror|scary|creepy|haunt|demon|ghost|zombie|evil|sinister|unsettling|monster roar|scream)\b/i },
    { tag: 'tavern',    re: /\b(tavern|inn pub|pub\b|alehouse|barkeep)\b/i },
    { tag: 'christmas', re: /\b(christmas|santa|sleigh|reindeer|carol|jingle|xmas|holiday)\b/i },
    { tag: 'halloween', re: /\b(halloween|pumpkin|witch|jack-o|spooky)\b/i },
    { tag: 'scifi',     re: /\b(sci-?fi|space|laser|robot|cyber|synth|alien|spaceship|plasma)\b/i },
    { tag: 'combat',    re: /\b(combat|battle|fight|sword (clash|swing)|punch|kick|blade)\b/i },
    { tag: 'nature',    re: /\b(forest|river|stream|waterfall|birds|wildlife|meadow|lake|ocean|waves?)\b/i },
    { tag: 'weather',   re: /\b(rain|thunder|storm|snow|blizzard|hail|hurricane|tornado)\b/i },
];

// -------- logic --------

function normalize(kws) {
    const seen = new Set();
    const out = [];
    for (const raw of kws || []) {
        if (typeof raw !== 'string') continue;
        const k = raw.trim().toLowerCase();
        if (!k) continue;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(k);
    }
    return out;
}

function retagEntry(entry, stats) {
    const before = { type: entry.type, keywords: [...(entry.keywords || [])], loop: entry.loop };
    const out = { ...entry };
    out.keywords = normalize(entry.keywords);

    // 1. Ambience reclassification — only sfx → ambience, never the other way.
    if (out.type === 'sfx' && AMBIENCE_NAME_RE.test(out.name || '')) {
        out.type = 'ambience';
        out.loop = true;
        if (!out.keywords.includes('ambience')) out.keywords.push('ambience');
        if (!out.keywords.includes('ambient'))  out.keywords.push('ambient');
        stats.reclassified++;
    }

    // 2. Genre tag inference against name + existing keywords.
    const haystack = [out.name || '', ...(out.keywords || [])].join(' ').toLowerCase();
    for (const rule of GENRE_RULES) {
        if (rule.re.test(haystack) && !out.keywords.includes(rule.tag)) {
            out.keywords.push(rule.tag);
            stats.genreAdds[rule.tag] = (stats.genreAdds[rule.tag] || 0) + 1;
        }
    }

    // 3. Track any change.
    const changed = (
        before.type !== out.type ||
        before.loop !== out.loop ||
        before.keywords.length !== out.keywords.length ||
        before.keywords.some((k, i) => k !== out.keywords[i])
    );
    if (changed) stats.changed++;
    return out;
}

function main() {
    const write = process.argv.includes('--write');
    const check = process.argv.includes('--check');
    const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data?.files)) {
        console.error('Expected { files: [...] } in', CATALOG_PATH);
        process.exit(1);
    }

    const stats = { total: data.files.length, changed: 0, reclassified: 0, genreAdds: {} };
    const next = data.files.map((f) => retagEntry(f, stats));

    console.log(`Catalog entries:      ${stats.total}`);
    console.log(`Entries changed:      ${stats.changed}`);
    console.log(`Re-typed → ambience:  ${stats.reclassified}`);
    console.log('Genre tag additions:');
    for (const [tag, count] of Object.entries(stats.genreAdds).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${tag.padEnd(10)} +${count}`);
    }

    if (write) {
        const serialized = JSON.stringify({ ...data, files: next }, null, 2);
        fs.writeFileSync(CATALOG_PATH, serialized + '\n', 'utf8');
        console.log(`\nWrote ${CATALOG_PATH}`);
    } else if (check) {
        if (stats.changed > 0) {
            console.error(`\nCatalog drift detected: ${stats.changed} entr${stats.changed === 1 ? 'y' : 'ies'} would change.`);
            console.error('Run `node scripts/retag-catalog.js --write` and commit the result.');
            process.exit(1);
        } else {
            console.log('\nCatalog is in sync with retag rules.');
        }
    } else {
        console.log('\n(dry-run — pass --write to overwrite or --check to fail on drift)');
    }
}

main();
