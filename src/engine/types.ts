// Core domain types for the Verline family tree engine

export interface Person {
  id: string;
  treeId: string;
  name: string;
  gender: 'male' | 'female' | 'other' | 'unspecified';
  dob?: string;       // ISO date string
  dod?: string;       // ISO date string
  photoUrl?: string;
  profession?: string;
  location?: string;
  bio?: string;
  createdBy?: string;
  createdAt?: string;
}

export type RelationshipType = 'PARENT_OF' | 'SPOUSE_OF';

export interface Relationship {
  id: string;
  treeId: string;
  type: RelationshipType;
  fromPersonId: string;
  toPersonId: string;
  isAdopted?: boolean;
  isDivorced?: boolean;
  createdAt?: string;
}

export interface Graph {
  parentsOf: Map<string, string[]>;   // childId -> [parentIds]
  childrenOf: Map<string, string[]>;  // parentId -> [childIds]
  spousesOf: Map<string, string[]>;   // personId -> [spouseIds]
}

export type Move = 'UP' | 'DOWN' | 'LATERAL';

export interface PathStep {
  personId: string;
  move: Move;
}

export interface RelationshipResult {
  label: string;             // e.g. "First Cousin"
  degree: number;            // up + down (ignoring lateral)
  degreeLabel: string;       // e.g. "2nd degree"
  path: PathStep[] | null;   // full hop sequence
  pathSummary: string;       // human-readable path
  isDirectFamily: boolean;   // parent/child/spouse/sibling
}

export interface Tree {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface NewPerson {
  name: string;
  gender: 'male' | 'female' | 'other' | 'unspecified';
  dob?: string;
  dod?: string;
  photoUrl?: string;
  profession?: string;
  location?: string;
  bio?: string;
}

export interface RelationInput {
  anchorPersonId: string;
  /** From the UI's perspective, what is the new person to the anchor? */
  type: 'PARENT' | 'CHILD' | 'SPOUSE' | 'SIBLING';
  isAdopted?: boolean;
}
