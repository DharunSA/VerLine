import { useCallback, useRef } from 'react';
import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { Person, Relationship } from '../../engine/types';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 90;
const RANK_SEP = 140;
const NODE_SEP = 80;
const TOP_MARGIN = 100;

export interface GenerationBand {
  generation: number;
  label: string;
  y: number;
  height: number;
}

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
  generationBands: GenerationBand[];
}

const BRANCH_COLORS = [
  '#C2672A', // sienna / paternal
  '#4A7A5E', // forest green / maternal
  '#5B6EA6', // slate blue
  '#8B5EA6', // plum
  '#A65E5E', // dusty rose
  '#5E8B7A', // teal
];

/**
 * Topological relaxation pass to compute generation levels.
 * Parent -> Child enforces childGen >= parentGen + 1.
 * Spouse <-> Spouse enforces spouseGen = max(genA, genB).
 * Guarantees 100% clean generation rows (Grandparents -> Parents -> Children -> Grandchildren).
 */
function calculateGenerations(
  people: Record<string, Person>,
  relationships: Relationship[]
): Record<string, number> {
  const gen: Record<string, number> = {};
  const allIds = Object.keys(people);
  if (allIds.length === 0) return {};

  const parentRels = relationships.filter(r => r.type === 'PARENT_OF');
  const spouseRels = relationships.filter(r => r.type === 'SPOUSE_OF');

  // 1. Identify primary roots (nodes with no parents in parentRels)
  const hasParent = new Set<string>();
  for (const r of parentRels) {
    if (people[r.toPersonId]) hasParent.add(r.toPersonId);
  }

  // Find oldest root birth year
  let minRootBirthYear = 2000;
  for (const id of allIds) {
    if (!hasParent.has(id) && people[id]?.dob) {
      const year = new Date(people[id].dob!).getFullYear();
      if (!isNaN(year) && year < minRootBirthYear) {
        minRootBirthYear = year;
      }
    }
  }

  // Initialize gen map with birth-year estimation as fallback
  for (const id of allIds) {
    const p = people[id];
    if (p?.dob) {
      const year = new Date(p.dob).getFullYear();
      if (!isNaN(year)) {
        const estGen = Math.max(0, Math.round((year - minRootBirthYear) / 28));
        gen[id] = estGen;
      } else {
        gen[id] = 0;
      }
    } else {
      gen[id] = 0;
    }
  }

  // 2. Iterative relaxation pass to enforce graph relationships (15 passes)
  for (let pass = 0; pass < 15; pass++) {
    let changed = false;

    // Parent -> Child: child generation must be at least parent generation + 1
    for (const r of parentRels) {
      if (people[r.fromPersonId] && people[r.toPersonId]) {
        const parentGen = gen[r.fromPersonId] ?? 0;
        const currentChildGen = gen[r.toPersonId] ?? 0;
        const targetChildGen = parentGen + 1;
        if (targetChildGen > currentChildGen) {
          gen[r.toPersonId] = targetChildGen;
          changed = true;
        }
      }
    }

    // Spouse <-> Spouse: both spouses must be at the maximum generation level of the couple
    for (const r of spouseRels) {
      if (people[r.fromPersonId] && people[r.toPersonId]) {
        const genA = gen[r.fromPersonId] ?? 0;
        const genB = gen[r.toPersonId] ?? 0;
        const maxGen = Math.max(genA, genB);
        if (genA !== maxGen) {
          gen[r.fromPersonId] = maxGen;
          changed = true;
        }
        if (genB !== maxGen) {
          gen[r.toPersonId] = maxGen;
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  // 3. Normalize so minimum generation starts at 0
  const minGen = Math.min(...Object.values(gen));
  if (minGen < 0) {
    for (const id of allIds) {
      gen[id] -= minGen;
    }
  }

  return gen;
}

/** Trace lineage roots and assign branch colors */
function assignBranchColors(
  people: Record<string, Person>,
  relationships: Relationship[]
): Record<string, string> {
  const parentsOf = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type === 'PARENT_OF') {
      const parents = parentsOf.get(r.toPersonId) ?? [];
      parents.push(r.fromPersonId);
      parentsOf.set(r.toPersonId, parents);
    }
  }

  const allIds = new Set(Object.keys(people));
  const roots: string[] = [];
  for (const id of allIds) {
    if (!parentsOf.has(id) || (parentsOf.get(id)?.length ?? 0) === 0) {
      roots.push(id);
    }
  }

  const colorMap: Record<string, string> = {};
  const childrenOf = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type === 'PARENT_OF') {
      const ch = childrenOf.get(r.fromPersonId) ?? [];
      ch.push(r.toPersonId);
      childrenOf.set(r.fromPersonId, ch);
    }
  }

  roots.forEach((rootId, idx) => {
    const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
    const queue = [rootId];
    while (queue.length) {
      const id = queue.shift()!;
      if (!colorMap[id]) {
        colorMap[id] = color;
        const children = childrenOf.get(id) ?? [];
        queue.push(...children);
      }
    }
  });

  for (const id of allIds) {
    if (!colorMap[id]) colorMap[id] = BRANCH_COLORS[0];
  }

  return colorMap;
}

/** Count total descendants of a person */
function countDescendants(
  rootId: string,
  relationships: Relationship[]
): number {
  const childrenOf = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type === 'PARENT_OF') {
      const ch = childrenOf.get(r.fromPersonId) ?? [];
      ch.push(r.toPersonId);
      childrenOf.set(r.fromPersonId, ch);
    }
  }

  const visited = new Set<string>();
  const queue = childrenOf.get(rootId) ? [...childrenOf.get(rootId)!] : [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (!visited.has(id)) {
      visited.add(id);
      const kids = childrenOf.get(id) ?? [];
      queue.push(...kids);
    }
  }
  return visited.size;
}

/** Load absolute positions from localStorage */
function getStoredPositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem('verline-node-offsets');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useAutoLayout(
  people: Record<string, Person>,
  relationships: Relationship[],
  collapsedBranches: Set<string>
): LayoutResult {
  const resultRef = useRef<LayoutResult>({ nodes: [], edges: [], generationBands: [] });

  const compute = useCallback(() => {
    const peopleList = Object.values(people);
    if (peopleList.length === 0) return { nodes: [], edges: [], generationBands: [] };

    const branchColors = assignBranchColors(people, relationships);
    const storedPositions = getStoredPositions();

    // 1. Calculate explicit generation levels for 100% strict vertical alignment
    const generations = calculateGenerations(people, relationships);

    const g = new dagre.graphlib.Graph({ multigraph: false });
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: 'TB',
      ranksep: RANK_SEP,
      nodesep: NODE_SEP,
      edgesep: 30,
      marginx: 80,
      marginy: 120,
    });

    // Calculate collapsed subtree IDs
    const collapsedIds = new Set<string>();
    if (collapsedBranches.size > 0) {
      const childrenOf = new Map<string, string[]>();
      for (const r of relationships) {
        if (r.type === 'PARENT_OF') {
          const ch = childrenOf.get(r.fromPersonId) ?? [];
          ch.push(r.toPersonId);
          childrenOf.set(r.fromPersonId, ch);
        }
      }
      for (const rootId of collapsedBranches) {
        const queue = childrenOf.get(rootId) ? [...childrenOf.get(rootId)!] : [];
        while (queue.length) {
          const id = queue.shift()!;
          collapsedIds.add(id);
          queue.push(...(childrenOf.get(id) ?? []));
        }
      }
    }

    // Add visible nodes to dagre
    for (const p of peopleList) {
      if (collapsedIds.has(p.id)) continue;
      g.setNode(p.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }

    const parentRels = relationships.filter(r => r.type === 'PARENT_OF');
    const spouseRels = relationships.filter(r => r.type === 'SPOUSE_OF');

    // Build spouse pair map for edge deduplication & layout coupling
    const spousePairs = new Map<string, string>(); // personId -> spouseId
    for (const r of spouseRels) {
      spousePairs.set(r.fromPersonId, r.toPersonId);
      spousePairs.set(r.toPersonId, r.fromPersonId);
    }

    // Add parent-child edges to dagre
    const addedDagreEdges = new Set<string>();
    for (const r of parentRels) {
      if (collapsedIds.has(r.fromPersonId) || collapsedIds.has(r.toPersonId)) continue;
      if (g.hasNode(r.fromPersonId) && g.hasNode(r.toPersonId)) {
        const edgeKey = `${r.fromPersonId}->${r.toPersonId}`;
        if (!addedDagreEdges.has(edgeKey)) {
          g.setEdge(r.fromPersonId, r.toPersonId);
          addedDagreEdges.add(edgeKey);
        }
      }
    }

    // Add spouse edges with low weight so Dagre keeps spouses close horizontally
    for (const r of spouseRels) {
      if (collapsedIds.has(r.fromPersonId) || collapsedIds.has(r.toPersonId)) continue;
      if (g.hasNode(r.fromPersonId) && g.hasNode(r.toPersonId)) {
        g.setEdge(r.fromPersonId, r.toPersonId, { weight: 0, minlen: 0 });
      }
    }

    // Run dagre auto-layout for horizontal X coordinates
    dagre.layout(g);

    // ─── Build React Flow nodes with STRICT vertical generation alignment ──────
    const rfNodes: Node[] = [];
    const nodesByGeneration = new Map<number, Node[]>();

    for (const p of peopleList) {
      if (collapsedIds.has(p.id)) continue;
      const nodePos = g.node(p.id);
      if (!nodePos) continue;

      const genLevel = generations[p.id] ?? 0;

      // Strict Y calculation: EVERY node in generation G gets the exact same Y position!
      const strictY = TOP_MARGIN + genLevel * (NODE_HEIGHT + RANK_SEP);
      const dagreX = nodePos.x - NODE_WIDTH / 2;

      // Lock Y strictly to calculated generation band Y to prevent vertical drift
      // Stored X offset is preserved for horizontal fine-tuning
      const stored = storedPositions[p.id];
      const finalX = stored ? stored.x : dagreX;
      const finalY = strictY;

      const descCount = countDescendants(p.id, relationships);

      const node: Node = {
        id: p.id,
        type: 'personNode',
        position: { x: finalX, y: finalY },
        data: {
          person: p,
          branchColor: branchColors[p.id] ?? BRANCH_COLORS[0],
          collapsedCount: collapsedBranches.has(p.id) ? descCount : 0,
        },
      };

      rfNodes.push(node);

      const existingInGen = nodesByGeneration.get(genLevel) ?? [];
      existingInGen.push(node);
      nodesByGeneration.set(genLevel, existingInGen);
    }

    // ─── Align Spouse Pairs Side-by-Side horizontally ─────────────────────────
    const processedSpousePairs = new Set<string>();
    for (const r of spouseRels) {
      if (collapsedIds.has(r.fromPersonId) || collapsedIds.has(r.toPersonId)) continue;
      const pairKey = [r.fromPersonId, r.toPersonId].sort().join('-');
      if (processedSpousePairs.has(pairKey)) continue;
      processedSpousePairs.add(pairKey);

      const nodeA = rfNodes.find(n => n.id === r.fromPersonId);
      const nodeB = rfNodes.find(n => n.id === r.toPersonId);

      // Only auto-align horizontally if neither node was manually dragged
      if (nodeA && nodeB && !storedPositions[r.fromPersonId] && !storedPositions[r.toPersonId]) {
        // Enforce SAME strict Y level (spouse level)
        const genLevel = generations[r.fromPersonId] ?? 0;
        const strictY = TOP_MARGIN + genLevel * (NODE_HEIGHT + RANK_SEP);
        nodeA.position.y = strictY;
        nodeB.position.y = strictY;

        // Place side-by-side around average X
        const avgX = (nodeA.position.x + nodeB.position.x) / 2;
        const spouseGap = 20; // 20px space between spouse cards
        nodeA.position.x = avgX - NODE_WIDTH - spouseGap / 2;
        nodeB.position.x = avgX + spouseGap / 2;
      }
    }

    // ─── Horizontal Overlap Prevention Pass per Generation Row ──────────────────
    for (const genLevel of Array.from(nodesByGeneration.keys())) {
      const rowNodes = nodesByGeneration.get(genLevel)!.sort((a, b) => a.position.x - b.position.x);
      const minSpacing = NODE_WIDTH + 30; // 180 + 30 = 210px

      for (let i = 0; i < rowNodes.length - 1; i++) {
        const current = rowNodes[i];
        const next = rowNodes[i + 1];
        if (next.position.x - current.position.x < minSpacing) {
          next.position.x = current.position.x + minSpacing;
        }
      }
    }

    // ─── Build Generation Background Bands ─────────────────────────────────────
    const sortedGenLevels = Array.from(nodesByGeneration.keys()).sort((a, b) => a - b);
    const generationLabels = [
      '1st Generation (Grandparents / Ancestors)',
      '2nd Generation (Parents & Uncles/Aunts)',
      '3rd Generation (Current Generation)',
      '4th Generation (Children)',
      '5th Generation (Grandchildren)',
      '6th Generation (Great-Grandchildren)',
    ];

    const generationBands: GenerationBand[] = sortedGenLevels.map(genLevel => {
      const bandY = TOP_MARGIN + genLevel * (NODE_HEIGHT + RANK_SEP) - 20;
      return {
        generation: genLevel + 1,
        label: generationLabels[genLevel] ?? `${genLevel + 1}th Generation`,
        y: bandY,
        height: NODE_HEIGHT + 40,
      };
    });

    // ─── Build React Flow Edges ────────────────────────────────────────────────
    const rfEdges: Edge[] = [];
    const childParentEdgeMap = new Map<string, string[]>(); // childId -> [parentIds]
    for (const r of parentRels) {
      if (collapsedIds.has(r.fromPersonId) || collapsedIds.has(r.toPersonId)) continue;
      const parents = childParentEdgeMap.get(r.toPersonId) ?? [];
      parents.push(r.fromPersonId);
      childParentEdgeMap.set(r.toPersonId, parents);
    }

    const addedParentEdges = new Set<string>();

    for (const r of parentRels) {
      if (collapsedIds.has(r.fromPersonId) || collapsedIds.has(r.toPersonId)) continue;
      const childId = r.toPersonId;
      const parents = childParentEdgeMap.get(childId) ?? [];

      // If child has 2 parents who are spouses of each other, render 1 clean parent edge from primary parent
      if (parents.length > 1) {
        const spouseId = spousePairs.get(r.fromPersonId);
        if (spouseId && parents.includes(spouseId)) {
          const primaryParentId = parents.slice().sort()[0];
          if (r.fromPersonId !== primaryParentId) {
            continue; // Skip redundant second parent edge
          }
        }
      }

      const edgeId = `e-${r.id}`;
      if (!addedParentEdges.has(edgeId)) {
        addedParentEdges.add(edgeId);
        rfEdges.push({
          id: edgeId,
          source: r.fromPersonId,
          target: r.toPersonId,
          sourceHandle: 'bottom-source',
          targetHandle: 'top-target',
          type: 'relationshipEdge',
          data: {
            edgeType: r.isAdopted ? 'adopted' : 'blood',
            relationshipId: r.id,
          },
        });
      }
    }

    // Render horizontal marriage edges between spouses side-by-side
    const addedSpouseEdges = new Set<string>();
    for (const r of spouseRels) {
      if (collapsedIds.has(r.fromPersonId) || collapsedIds.has(r.toPersonId)) continue;
      const pairKey = [r.fromPersonId, r.toPersonId].sort().join('-');
      if (addedSpouseEdges.has(pairKey)) continue;
      addedSpouseEdges.add(pairKey);

      const nodeA = rfNodes.find(n => n.id === r.fromPersonId);
      const nodeB = rfNodes.find(n => n.id === r.toPersonId);

      // Determine left node and right node by X position for side-to-side handle binding
      const isALeft = (nodeA?.position.x ?? 0) <= (nodeB?.position.x ?? 0);
      const leftId = isALeft ? r.fromPersonId : r.toPersonId;
      const rightId = isALeft ? r.toPersonId : r.fromPersonId;

      rfEdges.push({
        id: `e-${r.id}`,
        source: leftId,
        target: rightId,
        sourceHandle: 'right-source',
        targetHandle: 'left-target',
        type: 'relationshipEdge',
        data: {
          edgeType: r.isDivorced ? 'divorced' : 'marriage',
          relationshipId: r.id,
        },
      });
    }

    return { nodes: rfNodes, edges: rfEdges, generationBands };
  }, [people, relationships, collapsedBranches]);

  const result = compute();
  resultRef.current = result;
  return result;
}
