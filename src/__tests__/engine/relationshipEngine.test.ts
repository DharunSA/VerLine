import { describe, it, expect } from 'vitest';
import { buildGraph } from '../../engine/graph';
import { findPath } from '../../engine/relationshipPath';
import { computeRelationship } from '../../engine/relationshipLabel';
import type { Relationship, Person } from '../../engine/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rel(
  id: string,
  type: 'PARENT_OF' | 'SPOUSE_OF',
  from: string,
  to: string,
  opts?: { isAdopted?: boolean; isDivorced?: boolean }
): Relationship {
  return { id, treeId: 't1', type, fromPersonId: from, toPersonId: to, ...opts };
}

function person(id: string, name: string): Person {
  return { id, treeId: 't1', name, gender: 'unspecified' };
}

// ─── Fixture: Nuclear Family ──────────────────────────────────────────────────
//   dad ──SPOUSE── mom
//    └──PARENT──┬── child1 (me)
//               └── child2 (sibling)

const nuclearRels: Relationship[] = [
  rel('r1', 'SPOUSE_OF', 'dad', 'mom'),
  rel('r2', 'PARENT_OF', 'dad', 'child1'),
  rel('r3', 'PARENT_OF', 'mom', 'child1'),
  rel('r4', 'PARENT_OF', 'dad', 'child2'),
  rel('r5', 'PARENT_OF', 'mom', 'child2'),
];

const nuclearPeople: Record<string, Person> = {
  dad: person('dad', 'Dad'),
  mom: person('mom', 'Mom'),
  child1: person('child1', 'Me'),
  child2: person('child2', 'Sibling'),
};

describe('Nuclear Family', () => {
  const graph = buildGraph(nuclearRels);

  it('child → parent is "Parent"', () => {
    const r = computeRelationship(graph, nuclearPeople, 'child1', 'dad');
    expect(r.label).toBe('Parent');
    expect(r.degree).toBe(1);
  });

  it('parent → child is "Child"', () => {
    const r = computeRelationship(graph, nuclearPeople, 'dad', 'child1');
    expect(r.label).toBe('Child');
    expect(r.degree).toBe(1);
  });

  it('spouse ↔ spouse is "Spouse"', () => {
    const r = computeRelationship(graph, nuclearPeople, 'dad', 'mom');
    expect(r.label).toBe('Spouse');
    expect(r.degree).toBe(0);
  });

  it('child1 → child2 is "Sibling"', () => {
    const r = computeRelationship(graph, nuclearPeople, 'child1', 'child2');
    expect(r.label).toBe('Sibling');
    expect(r.degree).toBe(2);
  });

  it('self → self returns "Self"', () => {
    const r = computeRelationship(graph, nuclearPeople, 'child1', 'child1');
    expect(r.label).toBe('Self');
  });
});

// ─── Fixture: Grandparents ────────────────────────────────────────────────────
//   gf ──SPOUSE── gm
//     └──PARENT──► dad ──PARENT──► me

const grandRels: Relationship[] = [
  rel('r1', 'SPOUSE_OF', 'gf', 'gm'),
  rel('r2', 'PARENT_OF', 'gf', 'dad'),
  rel('r3', 'PARENT_OF', 'gm', 'dad'),
  rel('r4', 'PARENT_OF', 'dad', 'me'),
];

const grandPeople: Record<string, Person> = {
  gf: person('gf', 'Grandpa'),
  gm: person('gm', 'Grandma'),
  dad: person('dad', 'Dad'),
  me: person('me', 'Me'),
};

describe('Grandparents', () => {
  const graph = buildGraph(grandRels);

  it('me → grandpa is "Grandparent"', () => {
    const r = computeRelationship(graph, grandPeople, 'me', 'gf');
    expect(r.label).toBe('Grandparent');
    expect(r.degree).toBe(2);
  });

  it('grandpa → me is "Grandchild"', () => {
    const r = computeRelationship(graph, grandPeople, 'gf', 'me');
    expect(r.label).toBe('Grandchild');
    expect(r.degree).toBe(2);
  });
});

// ─── Fixture: First Cousins ───────────────────────────────────────────────────
//   gf ──SPOUSE── gm
//   ├──PARENT──► dad ──PARENT──► me
//   └──PARENT──► uncle ──PARENT──► cousin

const cousinRels: Relationship[] = [
  rel('r1', 'SPOUSE_OF', 'gf', 'gm'),
  rel('r2', 'PARENT_OF', 'gf', 'dad'),
  rel('r3', 'PARENT_OF', 'gm', 'dad'),
  rel('r4', 'PARENT_OF', 'gf', 'uncle'),
  rel('r5', 'PARENT_OF', 'gm', 'uncle'),
  rel('r6', 'PARENT_OF', 'dad', 'me'),
  rel('r7', 'PARENT_OF', 'uncle', 'cousin'),
];

const cousinPeople: Record<string, Person> = {
  gf: person('gf', 'Grandpa'),
  gm: person('gm', 'Grandma'),
  dad: person('dad', 'Dad'),
  uncle: person('uncle', 'Uncle'),
  me: person('me', 'Me'),
  cousin: person('cousin', 'Cousin'),
};

describe('First Cousins', () => {
  const graph = buildGraph(cousinRels);

  it('me → cousin is "First Cousin"', () => {
    const r = computeRelationship(graph, cousinPeople, 'me', 'cousin');
    expect(r.label).toBe('First Cousin');
    expect(r.degree).toBe(4);
  });

  it('cousin → me is "First Cousin" (symmetric)', () => {
    const r = computeRelationship(graph, cousinPeople, 'cousin', 'me');
    expect(r.label).toBe('First Cousin');
  });

  it('me → uncle is "Aunt/Uncle"', () => {
    const r = computeRelationship(graph, cousinPeople, 'me', 'uncle');
    expect(r.label).toBe('Aunt/Uncle');
  });

  it('uncle → me is "Niece/Nephew"', () => {
    const r = computeRelationship(graph, cousinPeople, 'uncle', 'me');
    expect(r.label).toBe('Niece/Nephew');
  });
});

// ─── Fixture: Half-Siblings ───────────────────────────────────────────────────
//   dad ──PARENT──► child1 (me)
//   dad ──PARENT──► child2 (half-sib — different mom)
//   mom1 ──PARENT──► child1
//   mom2 ──PARENT──► child2

const halfSibRels: Relationship[] = [
  rel('r1', 'PARENT_OF', 'dad', 'child1'),
  rel('r2', 'PARENT_OF', 'mom1', 'child1'),
  rel('r3', 'PARENT_OF', 'dad', 'child2'),
  rel('r4', 'PARENT_OF', 'mom2', 'child2'),
];

const halfSibPeople: Record<string, Person> = {
  dad: person('dad', 'Dad'),
  mom1: person('mom1', 'Mom1'),
  mom2: person('mom2', 'Mom2'),
  child1: person('child1', 'Me'),
  child2: person('child2', 'HalfSib'),
};

describe('Half-Siblings', () => {
  const graph = buildGraph(halfSibRels);

  it('child1 → child2 is "Half-Sibling"', () => {
    const r = computeRelationship(graph, halfSibPeople, 'child1', 'child2');
    expect(r.label).toBe('Half-Sibling');
  });
});

// ─── Fixture: Cousins Once Removed ───────────────────────────────────────────
//   gg ──PARENT──► gf ──PARENT──► dad ──PARENT──► me
//   gg ──PARENT──► great_uncle ──PARENT──► uncle ──PARENT──► cousin

const cousinOncePeople: Record<string, Person> = {
  gg: person('gg', 'GreatGrandpa'),
  gf: person('gf', 'Grandpa'),
  great_uncle: person('great_uncle', 'GreatUncle'),
  dad: person('dad', 'Dad'),
  uncle: person('uncle', 'Uncle'),
  me: person('me', 'Me'),
  cousin: person('cousin', 'Cousin'),
};

const cousinOnceRels: Relationship[] = [
  rel('r1', 'PARENT_OF', 'gg', 'gf'),
  rel('r2', 'PARENT_OF', 'gg', 'great_uncle'),
  rel('r3', 'PARENT_OF', 'gf', 'dad'),
  rel('r4', 'PARENT_OF', 'great_uncle', 'uncle'),
  rel('r5', 'PARENT_OF', 'dad', 'me'),
  rel('r6', 'PARENT_OF', 'uncle', 'cousin'),
];

describe('Cousins Once Removed', () => {
  const graph = buildGraph(cousinOnceRels);

  it('me → uncle is "First Cousin, once removed"', () => {
    const r = computeRelationship(graph, cousinOncePeople, 'me', 'uncle');
    expect(r.label).toBe('First Cousin, once removed');
  });

  it('uncle → me is "First Cousin, once removed"', () => {
    const r = computeRelationship(graph, cousinOncePeople, 'uncle', 'me');
    expect(r.label).toBe('First Cousin, once removed');
  });
});

// ─── Fixture: Spouse of Cousin (In-Law) ──────────────────────────────────────
//   cousin ──SPOUSE── cousin_spouse
//   me → cousin = First Cousin
//   me → cousin_spouse = (cousin-in-law, extended)

const cousinSpouseRels: Relationship[] = [
  ...cousinRels,
  rel('r8', 'SPOUSE_OF', 'cousin', 'cousin_spouse'),
];

const cousinSpousePeople: Record<string, Person> = {
  ...cousinPeople,
  cousin_spouse: person('cousin_spouse', 'Cousin Spouse'),
};

describe('Spouse of Cousin', () => {
  const graph = buildGraph(cousinSpouseRels);

  it('me → cousin_spouse path is found', () => {
    const path = findPath(graph, 'me', 'cousin_spouse');
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });
});

// ─── Fixture: Adopted Child ───────────────────────────────────────────────────

const adoptedRels: Relationship[] = [
  rel('r1', 'PARENT_OF', 'dad', 'adopted_child', { isAdopted: true }),
];

const adoptedPeople: Record<string, Person> = {
  dad: person('dad', 'Dad'),
  adopted_child: person('adopted_child', 'Adopted Child'),
};

describe('Adopted Child', () => {
  const graph = buildGraph(adoptedRels);

  it('dad → adopted_child is "Child"', () => {
    const r = computeRelationship(graph, adoptedPeople, 'dad', 'adopted_child');
    expect(r.label).toBe('Child');
  });

  it('adopted_child → dad is "Parent"', () => {
    const r = computeRelationship(graph, adoptedPeople, 'adopted_child', 'dad');
    expect(r.label).toBe('Parent');
  });
});

// ─── Fixture: No Relation Found ───────────────────────────────────────────────

describe('No Relation Found', () => {
  const graph = buildGraph([rel('r1', 'PARENT_OF', 'parent', 'child')]);
  const people: Record<string, Person> = {
    parent: person('parent', 'Parent'),
    child: person('child', 'Child'),
    stranger: person('stranger', 'Stranger'),
  };

  it('child → stranger returns "Unrelated"', () => {
    const r = computeRelationship(graph, people, 'child', 'stranger');
    expect(r.label).toBe('Unrelated');
    expect(r.path).toBeNull();
  });
});

// ─── Fixture: Great-Grandparents ─────────────────────────────────────────────

describe('Great-Grandparents', () => {
  const ggRels: Relationship[] = [
    rel('r1', 'PARENT_OF', 'ggp', 'gp'),
    rel('r2', 'PARENT_OF', 'gp', 'par'),
    rel('r3', 'PARENT_OF', 'par', 'me'),
  ];

  const ggPeople: Record<string, Person> = {
    ggp: person('ggp', 'Great-Grandpa'),
    gp: person('gp', 'Grandpa'),
    par: person('par', 'Parent'),
    me: person('me', 'Me'),
  };

  const graph = buildGraph(ggRels);

  it('me → ggp is "Great-Grandparent"', () => {
    const r = computeRelationship(graph, ggPeople, 'me', 'ggp');
    expect(r.label).toBe('Great-Grandparent');
    expect(r.degree).toBe(3);
  });

  it('ggp → me is "Great-Grandchild"', () => {
    const r = computeRelationship(graph, ggPeople, 'ggp', 'me');
    expect(r.label).toBe('Great-Grandchild');
    expect(r.degree).toBe(3);
  });
});
