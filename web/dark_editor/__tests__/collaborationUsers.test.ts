import { describe, it, expect } from 'vitest';
import { buildUsersById } from '@/lib/collaborationUsers';
import type { User } from '@/stores/collaborationStore';

const makeUser = (id: string, name: string): User => ({
  id,
  name,
  email: `${name}@example.com`,
  color: '#000000',
  role: 'editor',
  lastSeen: Date.now(),
  isOnline: true,
});

describe('buildUsersById', () => {
  it('returns an empty record for an empty array', () => {
    const map = buildUsersById([]);
    expect(Object.keys(map)).toHaveLength(0);
  });

  it('maps every user by id', () => {
    const users = [makeUser('u1', 'Alice'), makeUser('u2', 'Bob')];
    const map = buildUsersById(users);
    expect(map.u1.name).toBe('Alice');
    expect(map.u2.name).toBe('Bob');
  });

  it('performs O(1) author lookups', () => {
    const users = [makeUser('u1', 'Alice'), makeUser('u2', 'Bob'), makeUser('u3', 'Carol')];
    const map = buildUsersById(users);
    expect(map.u3.email).toBe('Carol@example.com');
    expect(map['missing-id']).toBeUndefined();
  });

  it('overrides earlier entries with the same id', () => {
    const users = [makeUser('u1', 'Alice'), { ...makeUser('u1', 'Alicia') }];
    const map = buildUsersById(users);
    expect(map.u1.name).toBe('Alicia');
  });
});
