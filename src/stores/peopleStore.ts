import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Person, Relationship, Graph, NewPerson, RelationInput } from '../engine/types';
import { buildGraph } from '../engine/graph';
import { supabase } from '../lib/supabaseClient';
import { buildSearchIndex } from '../lib/fuzzySearch';

interface PeopleStore {
  // Data
  treeId: string | null;
  people: Record<string, Person>;
  relationships: Relationship[];
  graph: Graph;

  // Selection
  selectedPersonId: string | null;

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  setTreeId: (treeId: string) => void;
  fetchTree: (treeId: string) => Promise<void>;
  addPerson: (person: NewPerson, relation: RelationInput | null) => Promise<string>;
  addRelationship: (fromPersonId: string, toPersonId: string, type: 'PARENT' | 'CHILD' | 'SPOUSE' | 'SIBLING', isAdopted?: boolean) => Promise<void>;
  updateRelationship: (relationshipId: string, patch: Partial<Relationship>) => Promise<void>;
  removeRelationship: (relationshipId: string) => Promise<void>;
  editPerson: (id: string, patch: Partial<Person>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  selectPerson: (id: string | null) => void;

  // Demo mode (no Supabase)
  seedDemoData: () => void;
}

/** Recompute the graph whenever relationships change */
function recomputeGraph(rels: Relationship[]): Graph {
  return buildGraph(rels);
}

const DEMO_TREE_ID = 'demo-tree';

export const usePeopleStore = create<PeopleStore>((set, get) => ({
  treeId: null,
  people: {},
  relationships: [],
  graph: buildGraph([]),
  selectedPersonId: null,
  loading: false,
  error: null,

  setTreeId: (treeId) => set({ treeId }),

  fetchTree: async (treeId) => {
    set({ loading: true, error: null });
    try {
      const [{ data: peopleData }, { data: relData }] = await Promise.all([
        supabase.from('people').select('*').eq('tree_id', treeId),
        supabase.from('relationships').select('*').eq('tree_id', treeId),
      ]);

      const people: Record<string, Person> = {};
      for (const p of (peopleData ?? [])) {
        people[p.id] = {
          id: p.id,
          treeId: p.tree_id,
          name: p.name,
          gender: p.gender ?? 'unspecified',
          dob: p.dob ?? undefined,
          dod: p.dod ?? undefined,
          photoUrl: p.photo_url ?? undefined,
          profession: p.profession ?? undefined,
          location: p.location ?? undefined,
          bio: p.bio ?? undefined,
        };
      }

      const relationships: Relationship[] = (relData ?? []).map(r => ({
        id: r.id,
        treeId: r.tree_id,
        type: r.type,
        fromPersonId: r.from_person_id,
        toPersonId: r.to_person_id,
        isAdopted: r.is_adopted ?? false,
        isDivorced: r.is_divorced ?? false,
      }));

      const graph = recomputeGraph(relationships);
      buildSearchIndex(Object.values(people));

      set({ treeId, people, relationships, graph, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  addPerson: async (newPerson, relation) => {
    const { treeId, people, relationships } = get();

    // Generate local ID for immediate optimistic update
    const personId = uuidv4();
    const person: Person = {
      id: personId,
      treeId: treeId ?? DEMO_TREE_ID,
      ...newPerson,
    };

    const newRelationships: Relationship[] = [];
    // Track edge keys to deduplicate
    const edgeSet = new Set<string>(
      relationships.map(r => `${r.type}:${r.fromPersonId}:${r.toPersonId}`)
    );

    const addEdge = (type: Relationship['type'], from: string, to: string, extra: Partial<Relationship> = {}) => {
      const key = `${type}:${from}:${to}`;
      const reverseKey = `${type}:${to}:${from}`;
      // For SPOUSE_OF, treat bidirectional as same
      if (edgeSet.has(key) || (type === 'SPOUSE_OF' && edgeSet.has(reverseKey))) return;
      edgeSet.add(key);
      newRelationships.push({
        id: uuidv4(),
        treeId: treeId ?? DEMO_TREE_ID,
        type,
        fromPersonId: from,
        toPersonId: to,
        ...extra,
      });
    };

    if (relation) {
      const { anchorPersonId, type, isAdopted } = relation;
      const graph = get().graph;

      if (type === 'SPOUSE') {
        addEdge('SPOUSE_OF', personId, anchorPersonId);
      } else if (type === 'PARENT') {
        // new person is parent of anchor
        addEdge('PARENT_OF', personId, anchorPersonId, { isAdopted });

        // If anchor already has an existing parent, link new parent as spouse of existing parent
        const existingParents = graph.parentsOf.get(anchorPersonId) ?? [];
        for (const existingParentId of existingParents) {
          if (existingParentId !== personId) {
            addEdge('SPOUSE_OF', personId, existingParentId);
          }
        }
      } else if (type === 'CHILD') {
        // new person is child of anchor
        addEdge('PARENT_OF', anchorPersonId, personId, { isAdopted });

        // Auto-link new child to anchor's spouse if present
        const spouses = graph.spousesOf.get(anchorPersonId) ?? [];
        for (const spouseId of spouses) {
          if (spouseId !== personId) {
            addEdge('PARENT_OF', spouseId, personId, { isAdopted });
          }
        }
      } else if (type === 'SIBLING') {
        // Find anchor's parents and link new person as child of each
        const anchorParents = graph.parentsOf.get(anchorPersonId) ?? [];
        for (const parentId of anchorParents) {
          addEdge('PARENT_OF', parentId, personId);
        }
      }
    }

    // Optimistic update
    const updatedPeople = { ...people, [personId]: person };
    const updatedRelationships = [...relationships, ...newRelationships];
    const graph = recomputeGraph(updatedRelationships);
    buildSearchIndex(Object.values(updatedPeople));
    set({ people: updatedPeople, relationships: updatedRelationships, graph });

    // Persist to Supabase if connected
    if (treeId && treeId !== DEMO_TREE_ID) {
      try {
        await supabase.from('people').insert({
          id: personId,
          tree_id: treeId,
          name: person.name,
          gender: person.gender,
          dob: person.dob ?? null,
          dod: person.dod ?? null,
          photo_url: person.photoUrl ?? null,
          profession: person.profession ?? null,
          location: person.location ?? null,
          bio: person.bio ?? null,
        });

        if (newRelationships.length > 0) {
          await supabase.from('relationships').insert(
            newRelationships.map(r => ({
              id: r.id,
              tree_id: r.treeId,
              type: r.type,
              from_person_id: r.fromPersonId,
              to_person_id: r.toPersonId,
              is_adopted: r.isAdopted ?? false,
              is_divorced: r.isDivorced ?? false,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to persist to Supabase:', err);
      }
    }

    return personId;
  },

  addRelationship: async (fromPersonId, toPersonId, type, isAdopted) => {
    const { treeId, relationships } = get();

    const newRelationships: Relationship[] = [];
    const edgeSet = new Set<string>(
      relationships.map(r => `${r.type}:${r.fromPersonId}:${r.toPersonId}`)
    );

    const addEdge = (relType: Relationship['type'], from: string, to: string, extra: Partial<Relationship> = {}) => {
      const key = `${relType}:${from}:${to}`;
      const reverseKey = `${relType}:${to}:${from}`;
      if (edgeSet.has(key) || (relType === 'SPOUSE_OF' && edgeSet.has(reverseKey))) return;
      edgeSet.add(key);
      newRelationships.push({
        id: uuidv4(),
        treeId: treeId ?? DEMO_TREE_ID,
        type: relType,
        fromPersonId: from,
        toPersonId: to,
        ...extra,
      });
    };

    const graph = get().graph;

    if (type === 'SPOUSE') {
      addEdge('SPOUSE_OF', fromPersonId, toPersonId);
    } else if (type === 'PARENT') {
      // fromPerson is parent of toPerson
      addEdge('PARENT_OF', fromPersonId, toPersonId, { isAdopted });
      const existingParents = graph.parentsOf.get(toPersonId) ?? [];
      for (const pId of existingParents) {
        if (pId !== fromPersonId) {
          addEdge('SPOUSE_OF', fromPersonId, pId);
        }
      }
    } else if (type === 'CHILD') {
      // fromPerson is child of toPerson
      addEdge('PARENT_OF', toPersonId, fromPersonId, { isAdopted });
      const spouses = graph.spousesOf.get(toPersonId) ?? [];
      for (const sId of spouses) {
        if (sId !== fromPersonId) {
          addEdge('PARENT_OF', sId, fromPersonId, { isAdopted });
        }
      }
    } else if (type === 'SIBLING') {
      const parents = graph.parentsOf.get(toPersonId) ?? [];
      for (const pId of parents) {
        addEdge('PARENT_OF', pId, fromPersonId);
      }
    }

    const updatedRels = [...relationships, ...newRelationships];
    const newGraph = recomputeGraph(updatedRels);
    set({ relationships: updatedRels, graph: newGraph });

    if (treeId && treeId !== DEMO_TREE_ID && newRelationships.length > 0) {
      try {
        await supabase.from('relationships').insert(
          newRelationships.map(r => ({
            id: r.id,
            tree_id: r.treeId,
            type: r.type,
            from_person_id: r.fromPersonId,
            to_person_id: r.toPersonId,
            is_adopted: r.isAdopted ?? false,
            is_divorced: r.isDivorced ?? false,
          }))
        );
      } catch (err) {
        console.error('Failed to save relationship to Supabase:', err);
      }
    }
  },

  updateRelationship: async (relationshipId, patch) => {
    const { treeId, relationships } = get();
    const updatedRels = relationships.map(r => {
      if (r.id === relationshipId) {
        return { ...r, ...patch };
      }
      return r;
    });
    const graph = recomputeGraph(updatedRels);
    set({ relationships: updatedRels, graph });

    if (treeId && treeId !== DEMO_TREE_ID) {
      await supabase.from('relationships').update(patch).eq('id', relationshipId);
    }
  },

  removeRelationship: async (relationshipId) => {
    const { treeId, relationships } = get();
    const updatedRels = relationships.filter(r => r.id !== relationshipId);
    const graph = recomputeGraph(updatedRels);
    set({ relationships: updatedRels, graph });

    if (treeId && treeId !== DEMO_TREE_ID) {
      await supabase.from('relationships').delete().eq('id', relationshipId);
    }
  },

  editPerson: async (id, patch) => {
    const { treeId, people, relationships } = get();
    const existing = people[id];
    if (!existing) return;

    // Merge patch on top of existing to avoid overwriting undefined fields
    const updated: Person = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined)
      ),
    };
    const updatedPeople = { ...people, [id]: updated };
    buildSearchIndex(Object.values(updatedPeople));
    set({ people: updatedPeople });

    if (treeId && treeId !== DEMO_TREE_ID) {
      await supabase.from('people').update({
        name: updated.name,
        gender: updated.gender,
        dob: updated.dob ?? null,
        dod: updated.dod ?? null,
        photo_url: updated.photoUrl ?? null,
        profession: updated.profession ?? null,
        location: updated.location ?? null,
        bio: updated.bio ?? null,
      }).eq('id', id);
    }

    // Recompute graph (no structural change but keep consistent)
    const graph = recomputeGraph(relationships);
    set({ graph });
  },

  deletePerson: async (id) => {
    const { treeId, people, relationships } = get();
    const updatedPeople = { ...people };
    delete updatedPeople[id];
    const updatedRels = relationships.filter(
      r => r.fromPersonId !== id && r.toPersonId !== id
    );
    const graph = recomputeGraph(updatedRels);
    buildSearchIndex(Object.values(updatedPeople));
    // Clear selectedPersonId if the deleted person was selected
    set({
      people: updatedPeople,
      relationships: updatedRels,
      graph,
      selectedPersonId: null,
    });

    if (treeId && treeId !== DEMO_TREE_ID) {
      await supabase.from('people').delete().eq('id', id);
    }
  },

  selectPerson: (id) => set({ selectedPersonId: id }),

  seedDemoData: () => {
    const treeId = DEMO_TREE_ID;

    // Build a demo family:
    // Raj (grandpa) + Meena (grandma)
    //   ├─ Arjun (dad) + Priya (mom)
    //   │   ├─ Aditya (me) + Ananya (spouse)
    //   │   └─ Kavya (sister)
    //   └─ Sunita (aunt) + Dev (uncle-in-law)
    //       └─ Rohan (cousin)

    const people: Record<string, Person> = {
      raj: { id: 'raj', treeId, name: 'Raj Sharma', gender: 'male', dob: '1942-03-15', profession: 'Retired Teacher', location: 'Mumbai' },
      meena: { id: 'meena', treeId, name: 'Meena Sharma', gender: 'female', dob: '1945-08-22', profession: 'Homemaker', location: 'Mumbai' },
      arjun: { id: 'arjun', treeId, name: 'Arjun Sharma', gender: 'male', dob: '1968-11-10', profession: 'Software Engineer', location: 'Bangalore' },
      priya: { id: 'priya', treeId, name: 'Priya Sharma', gender: 'female', dob: '1971-04-25', profession: 'Doctor', location: 'Bangalore' },
      aditya: { id: 'aditya', treeId, name: 'Aditya Sharma', gender: 'male', dob: '1995-07-14', profession: 'Product Designer', location: 'Bangalore', bio: "That's me!" },
      kavya: { id: 'kavya', treeId, name: 'Kavya Sharma', gender: 'female', dob: '1998-02-09', profession: 'Student', location: 'Pune' },
      sunita: { id: 'sunita', treeId, name: 'Sunita Kapoor', gender: 'female', dob: '1972-06-30', profession: 'Architect', location: 'Delhi' },
      dev: { id: 'dev', treeId, name: 'Dev Kapoor', gender: 'male', dob: '1970-09-18', profession: 'Businessman', location: 'Delhi' },
      rohan: { id: 'rohan', treeId, name: 'Rohan Kapoor', gender: 'male', dob: '1999-12-01', profession: 'Graphic Designer', location: 'Delhi' },
      ananya: { id: 'ananya', treeId, name: 'Ananya Menon', gender: 'female', dob: '1996-05-20', profession: 'Journalist', location: 'Chennai', bio: "Aditya's spouse" },
    };

    const relationships: Relationship[] = [
      { id: 'r1', treeId, type: 'SPOUSE_OF', fromPersonId: 'raj', toPersonId: 'meena' },
      { id: 'r2', treeId, type: 'PARENT_OF', fromPersonId: 'raj', toPersonId: 'arjun' },
      { id: 'r3', treeId, type: 'PARENT_OF', fromPersonId: 'meena', toPersonId: 'arjun' },
      { id: 'r4', treeId, type: 'PARENT_OF', fromPersonId: 'raj', toPersonId: 'sunita' },
      { id: 'r5', treeId, type: 'PARENT_OF', fromPersonId: 'meena', toPersonId: 'sunita' },
      { id: 'r6', treeId, type: 'SPOUSE_OF', fromPersonId: 'arjun', toPersonId: 'priya' },
      { id: 'r7', treeId, type: 'PARENT_OF', fromPersonId: 'arjun', toPersonId: 'aditya' },
      { id: 'r8', treeId, type: 'PARENT_OF', fromPersonId: 'priya', toPersonId: 'aditya' },
      { id: 'r9', treeId, type: 'PARENT_OF', fromPersonId: 'arjun', toPersonId: 'kavya' },
      { id: 'r10', treeId, type: 'PARENT_OF', fromPersonId: 'priya', toPersonId: 'kavya' },
      { id: 'r11', treeId, type: 'SPOUSE_OF', fromPersonId: 'sunita', toPersonId: 'dev' },
      { id: 'r12', treeId, type: 'PARENT_OF', fromPersonId: 'sunita', toPersonId: 'rohan' },
      { id: 'r13', treeId, type: 'PARENT_OF', fromPersonId: 'dev', toPersonId: 'rohan' },
      { id: 'r14', treeId, type: 'SPOUSE_OF', fromPersonId: 'aditya', toPersonId: 'ananya' },
    ];

    const graph = buildGraph(relationships);
    buildSearchIndex(Object.values(people));

    set({
      treeId,
      people,
      relationships,
      graph,
      selectedPersonId: 'aditya',
    });
  },
}));
