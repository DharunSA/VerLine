import type { Graph, Move, PathStep } from './types';

/**
 * BFS-based relationship path finder.
 * Each hop is tagged UP (to parent), DOWN (to child), or LATERAL (to spouse).
 * Returns the shortest path from fromId to toId, or null if not connected.
 */
export function findPath(
  graph: Graph,
  fromId: string,
  toId: string
): PathStep[] | null {
  if (fromId === toId) return [];

  const visited = new Set<string>([fromId]);
  const queue: { id: string; path: PathStep[] }[] = [
    { id: fromId, path: [] },
  ];

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;

    const neighbors: { id: string; move: Move }[] = [
      ...(graph.parentsOf.get(id) ?? []).map(p => ({
        id: p,
        move: 'UP' as Move,
      })),
      ...(graph.childrenOf.get(id) ?? []).map(c => ({
        id: c,
        move: 'DOWN' as Move,
      })),
      ...(graph.spousesOf.get(id) ?? []).map(s => ({
        id: s,
        move: 'LATERAL' as Move,
      })),
    ];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.id)) continue;

      const newPath: PathStep[] = [
        ...path,
        { personId: neighbor.id, move: neighbor.move },
      ];

      if (neighbor.id === toId) {
        return newPath;
      }

      visited.add(neighbor.id);
      queue.push({ id: neighbor.id, path: newPath });
    }
  }

  return null; // not connected (different trees or genuinely unrelated)
}

/**
 * Extract the moves from a path (ignoring the person IDs).
 */
export function extractMoves(path: PathStep[]): Move[] {
  return path.map(step => step.move);
}
