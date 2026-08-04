import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Person } from '../engine/types';

let fuseIndex: Fuse<Person> | null = null;

const FUSE_OPTIONS: IFuseOptions<Person> = {
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'profession', weight: 0.2 },
    { name: 'location', weight: 0.15 },
    { name: 'bio', weight: 0.15 },
  ],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 1,
  ignoreLocation: true,
};

/** Rebuild the search index from the current people list. */
export function buildSearchIndex(people: Person[]) {
  fuseIndex = new Fuse(people, FUSE_OPTIONS);
}

/** Search people by name, profession, location, or bio with high precision. */
export function searchPeople(
  query: string,
  people: Person[]
): { person: Person; score: number }[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return people.map(p => ({ person: p, score: 1 }));

  const tokens = trimmed.split(/\s+/).filter(Boolean);

  const scored = people.map(p => {
    const nameLower = (p.name || '').toLowerCase();
    const profLower = (p.profession || '').toLowerCase();
    const locLower = (p.location || '').toLowerCase();
    const bioLower = (p.bio || '').toLowerCase();

    const nameWords = nameLower.split(/\s+/);
    const profWords = profLower.split(/\s+/);
    const locWords = locLower.split(/\s+/);
    const allText = `${nameLower} ${profLower} ${locLower} ${bioLower}`;

    let totalScore = 0;
    let matchedTokens = 0;

    // Direct full-string bonus
    if (nameLower === trimmed) {
      totalScore += 1000;
    } else if (nameLower.startsWith(trimmed)) {
      totalScore += 800;
    } else if (nameLower.includes(trimmed)) {
      totalScore += 600;
    } else if (allText.includes(trimmed)) {
      totalScore += 400;
    }

    // Evaluate each search token
    for (const t of tokens) {
      let tokenMatched = false;
      let tokenScore = 0;

      // Exact word match in name
      if (nameWords.some(w => w === t)) {
        tokenScore += 250;
        tokenMatched = true;
      }
      // Name word starts with token
      else if (nameWords.some(w => w.startsWith(t))) {
        tokenScore += 180;
        tokenMatched = true;
      }
      // Substring match in name
      else if (nameLower.includes(t)) {
        tokenScore += 120;
        tokenMatched = true;
      }
      // Match in profession or location
      else if (profWords.some(w => w.startsWith(t)) || locWords.some(w => w.startsWith(t))) {
        tokenScore += 90;
        tokenMatched = true;
      } else if (profLower.includes(t) || locLower.includes(t)) {
        tokenScore += 60;
        tokenMatched = true;
      }
      // Match in bio
      else if (bioLower.includes(t)) {
        tokenScore += 40;
        tokenMatched = true;
      }
      // Typo fuzzy fallback (for words length >= 3)
      else if (t.length >= 3) {
        if (nameWords.some(w => isFuzzyMatch(w, t))) {
          tokenScore += 30;
          tokenMatched = true;
        }
      }

      if (tokenMatched) {
        matchedTokens++;
        totalScore += tokenScore;
      }
    }

    // Bonus for matching ALL tokens in multi-token queries
    if (tokens.length > 1 && matchedTokens === tokens.length) {
      totalScore += 500;
    }

    return { person: p, score: totalScore, matchedTokens };
  });

  // Filter out non-matching persons
  let validResults = scored.filter(r => r.score > 0);

  // For multi-word queries (e.g. "raj sharma"), if any members match ALL tokens,
  // filter out candidates that only match a subset of tokens (e.g. "Meena Sharma").
  if (tokens.length > 1) {
    const allTokenMatches = validResults.filter(r => r.matchedTokens === tokens.length);
    if (allTokenMatches.length > 0) {
      validResults = allTokenMatches;
    }
  }

  // Sort by highest relevance score first
  validResults.sort((a, b) => b.score - a.score);

  const maxScore = validResults[0]?.score || 1;
  return validResults.map(r => ({
    person: r.person,
    score: Math.min(1, r.score / maxScore),
  }));
}

function isFuzzyMatch(word: string, target: string): boolean {
  if (Math.abs(word.length - target.length) > 2) return false;
  let diff = 0;
  const len = Math.min(word.length, target.length);
  for (let i = 0; i < len; i++) {
    if (word[i] !== target[i]) diff++;
    if (diff > 2) return false;
  }
  return diff <= 2;
}

/** Fuzzy duplicate detection: find people with similar name + DOB. */
export function findDuplicates(
  name: string,
  dob: string | undefined,
  people: Person[]
): Person[] {
  const nameFuse = new Fuse(people, {
    keys: ['name'],
    threshold: 0.3,
    minMatchCharLength: 1,
    ignoreLocation: true,
  });

  const nameMatches = nameFuse.search(name).map(r => r.item);

  if (!dob) return nameMatches.slice(0, 3);

  // If DOB provided, also rank by DOB match
  return nameMatches
    .filter(p => !p.dob || p.dob === dob || Math.abs(
      new Date(p.dob).getFullYear() - new Date(dob).getFullYear()
    ) <= 2)
    .slice(0, 3);
}
