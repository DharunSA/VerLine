import type { Graph, Move, PathStep, Person, RelationshipResult } from './types';
import { findPath, extractMoves } from './relationshipPath';
import { areHalfSiblings } from './graph';

interface MoveClassification {
  up: number;
  down: number;
  lateral: boolean;
}

function classify(moves: Move[]): MoveClassification {
  return {
    up: moves.filter(m => m === 'UP').length,
    down: moves.filter(m => m === 'DOWN').length,
    lateral: moves.includes('LATERAL'),
  };
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

function labelFor(
  { up, down, lateral }: MoveClassification,
  graph?: Graph,
  fromId?: string,
  toId?: string
): string {
  if (lateral && up === 0 && down === 0) return 'Spouse';
  if (up === 1 && down === 0 && !lateral) return 'Parent';
  if (up === 0 && down === 1 && !lateral) return 'Child';

  // Step-parent / Parent-in-law
  if (up === 1 && down === 0 && lateral) return 'Parent-in-law / Step-Parent';
  // Step-child / Child-in-law
  if (up === 0 && down === 1 && lateral) return 'Child-in-law / Step-Child';

  // Sibling — check for half-sibling / step-sibling
  if (up === 1 && down === 1) {
    if (lateral) return 'Sibling-in-law / Step-Sibling';
    if (graph && fromId && toId && areHalfSiblings(graph, fromId, toId)) {
      return 'Half-Sibling';
    }
    return 'Sibling';
  }

  // Grandparents & Grandchildren
  if (up === 2 && down === 0) return lateral ? 'Grandparent-in-law' : 'Grandparent';
  if (up === 0 && down === 2) return lateral ? 'Grandchild-in-law' : 'Grandchild';

  // Aunt / Uncle & Niece / Nephew (including through marriage)
  if (up === 2 && down === 1) return lateral ? 'Aunt/Uncle-in-law' : 'Aunt/Uncle';
  if (up === 1 && down === 2) return lateral ? 'Niece/Nephew-in-law' : 'Niece/Nephew';

  // Cousin logic (handles direct, step, and in-law cousins)
  if (up >= 2 && down >= 2) {
    const cousinDegree = Math.min(up, down) - 1;
    const removed = Math.abs(up - down);
    const ordinals = ['First', 'Second', 'Third', 'Fourth'];
    const degreeWord = ordinals[cousinDegree - 1] ?? `${ordinal(cousinDegree)}`;
    if (removed === 0) return `${degreeWord} Cousin`;
    const removedWord =
      removed === 1 ? 'once' : removed === 2 ? 'twice' : `${removed}x`;
    return `${degreeWord} Cousin, ${removedWord} removed`;
  }

  // Great-grandparent/child chains
  if (up > 2 && down === 0) {
    return 'Great-'.repeat(up - 2) + (lateral ? 'Grandparent-in-law' : 'Grandparent');
  }
  if (down > 2 && up === 0) {
    return 'Great-'.repeat(down - 2) + (lateral ? 'Grandchild-in-law' : 'Grandchild');
  }

  return 'Extended Relative';
}

/**
 * Build a human-readable path summary using person names.
 * e.g. "via Meena → Raj → you"
 */
function buildPathSummary(
  path: PathStep[],
  people: Record<string, Person>,
  fromId: string
): string {
  if (path.length === 0) return 'directly connected';

  const firstName = people[fromId]?.name ?? fromId;
  const parts: string[] = [firstName];

  for (const step of path) {
    const name = people[step.personId]?.name ?? step.personId;
    const arrow = step.move === 'UP' ? '↑' : step.move === 'DOWN' ? '↓' : '↔';
    parts.push(`${arrow} ${name}`);
  }

  return parts.join(' ');
}

/**
 * Main entry point: given two person IDs and a graph, return the full
 * RelationshipResult (label, degree, path, summary).
 */
export function computeRelationship(
  graph: Graph,
  people: Record<string, Person>,
  fromId: string,
  toId: string
): RelationshipResult {
  const path = findPath(graph, fromId, toId);

  if (path === null) {
    return {
      label: 'Unrelated',
      degree: Infinity,
      degreeLabel: 'Not connected',
      path: null,
      pathSummary: 'No connection found',
      isDirectFamily: false,
    };
  }

  if (path.length === 0) {
    return {
      label: 'Self',
      degree: 0,
      degreeLabel: '0th degree',
      path: [],
      pathSummary: 'Same person',
      isDirectFamily: true,
    };
  }

  const moves = extractMoves(path);
  const classification = classify(moves);
  const label = labelFor(classification, graph, fromId, toId);

  // Degree = up + down hops (spouse hops don't count toward degree number)
  const degree = classification.up + classification.down;
  const degreeLabel =
    degree === 0
      ? 'Direct'
      : degree === 1
      ? '1st degree'
      : `${ordinal(degree)} degree`;

  const isDirectFamily =
    ['Spouse', 'Parent', 'Child', 'Sibling'].includes(label);

  const pathSummary = buildPathSummary(path, people, fromId);

  return {
    label,
    degree,
    degreeLabel,
    path,
    pathSummary,
    isDirectFamily,
  };
}

// Re-export for convenience
export { labelFor, classify };
