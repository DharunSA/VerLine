import type { Graph, Relationship } from './types';

function pushTo(map: Map<string, string[]>, key: string, value: string) {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

/**
 * Build an in-memory adjacency graph from a flat list of relationships.
 * Only PARENT_OF and SPOUSE_OF edges are stored; all derived relations are
 * computed on the fly from this structure.
 */
export function buildGraph(relationships: Relationship[]): Graph {
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const spousesOf = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === 'PARENT_OF') {
      pushTo(childrenOf, r.fromPersonId, r.toPersonId);
      pushTo(parentsOf, r.toPersonId, r.fromPersonId);
    } else if (r.type === 'SPOUSE_OF') {
      // Bidirectional — stored once, treated as undirected
      pushTo(spousesOf, r.fromPersonId, r.toPersonId);
      pushTo(spousesOf, r.toPersonId, r.fromPersonId);
    }
  }

  return { parentsOf, childrenOf, spousesOf };
}

/**
 * Returns all person IDs that appear in the graph (parents or children or spouses).
 */
export function getAllPersonIds(graph: Graph): Set<string> {
  const ids = new Set<string>();
  for (const key of graph.parentsOf.keys()) ids.add(key);
  for (const key of graph.childrenOf.keys()) ids.add(key);
  for (const key of graph.spousesOf.keys()) ids.add(key);
  return ids;
}

/**
 * Returns true if two people are half-siblings (share exactly one parent, not two).
 */
export function areHalfSiblings(graph: Graph, aId: string, bId: string): boolean {
  const parentsA = new Set(graph.parentsOf.get(aId) ?? []);
  const parentsB = graph.parentsOf.get(bId) ?? [];
  const shared = parentsB.filter(p => parentsA.has(p));
  return shared.length === 1;
}

/**
 * Returns true if two people share at least one parent (full or half sibling).
 */
export function areSiblings(graph: Graph, aId: string, bId: string): boolean {
  if (aId === bId) return false;
  const parentsA = new Set(graph.parentsOf.get(aId) ?? []);
  const parentsB = graph.parentsOf.get(bId) ?? [];
  return parentsB.some(p => parentsA.has(p));
}
