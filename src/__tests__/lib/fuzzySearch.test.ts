import { describe, it, expect } from 'vitest';
import { searchPeople } from '../../lib/fuzzySearch';
import type { Person } from '../../engine/types';

const samplePeople: Person[] = [
  {
    id: '1',
    treeId: 'tree-1',
    name: 'Raj Sharma',
    gender: 'male',
    profession: 'Retired Teacher',
    location: 'Mumbai',
  },
  {
    id: '2',
    treeId: 'tree-1',
    name: 'Meena Sharma',
    gender: 'female',
    profession: 'Homemaker',
    location: 'Mumbai',
  },
  {
    id: '3',
    treeId: 'tree-1',
    name: 'Priya Sharma',
    gender: 'female',
    profession: 'Doctor',
    location: 'Bangalore',
  },
  {
    id: '4',
    treeId: 'tree-1',
    name: 'Rajesh Kumar',
    gender: 'male',
    profession: 'Software Engineer',
    location: 'Chennai',
  },
];

describe('fuzzySearch', () => {
  it('should return ONLY Raj Sharma for multi-word query "raj sharma"', () => {
    const results = searchPeople('raj sharma', samplePeople);
    const names = results.map(r => r.person.name);
    expect(names).toEqual(['Raj Sharma']);
  });

  it('should find results for single character queries like "R"', () => {
    const results = searchPeople('R', samplePeople);
    const names = results.map(r => r.person.name);
    expect(names).toContain('Raj Sharma');
    expect(names).toContain('Rajesh Kumar');
  });

  it('should find results for case-insensitive single character "r"', () => {
    const results = searchPeople('r', samplePeople);
    const names = results.map(r => r.person.name);
    expect(names).toContain('Raj Sharma');
    expect(names).toContain('Rajesh Kumar');
  });

  it('should find results for "raj"', () => {
    const results = searchPeople('raj', samplePeople);
    const names = results.map(r => r.person.name);
    expect(names).toContain('Raj Sharma');
    expect(names).toContain('Rajesh Kumar');
    expect(names).not.toContain('Meena Sharma');
  });

  it('should find results by profession (e.g. "Doctor")', () => {
    const results = searchPeople('Doctor', samplePeople);
    const names = results.map(r => r.person.name);
    expect(names).toEqual(['Priya Sharma']);
  });

  it('should find results by location (e.g. "Mumbai")', () => {
    const results = searchPeople('Mumbai', samplePeople);
    const names = results.map(r => r.person.name);
    expect(names).toContain('Raj Sharma');
    expect(names).toContain('Meena Sharma');
  });

  it('should filter multi-word profession + location queries like "Doctor Bangalore"', () => {
    const results = searchPeople('Doctor Bangalore', samplePeople);
    const names = results.map(r => r.person.name);
    expect(names).toEqual(['Priya Sharma']);
  });
});
