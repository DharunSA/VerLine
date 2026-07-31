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
  minMatchCharLength: 2,
};

/** Rebuild the search index from the current people list. */
export function buildSearchIndex(people: Person[]) {
  fuseIndex = new Fuse(people, FUSE_OPTIONS);
}

/** Search people by name, profession, location, or bio. */
export function searchPeople(
  query: string,
  people: Person[]
): { person: Person; score: number }[] {
  if (!query.trim()) return people.map(p => ({ person: p, score: 1 }));

  if (!fuseIndex) {
    fuseIndex = new Fuse(people, FUSE_OPTIONS);
  }

  const results = fuseIndex.search(query);
  return results.map(r => ({
    person: r.item,
    score: 1 - (r.score ?? 0),
  }));
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
    minMatchCharLength: 2,
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
