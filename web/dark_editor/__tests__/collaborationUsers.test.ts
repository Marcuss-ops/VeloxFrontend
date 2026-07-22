import { describe, it, expect } from 'vitest';
import { buildUsersById } from '@/lib/collaborationUsers';
import type { User } from '@/stores/collaborationStore';

const makeUser = (id: string): User => ({
  id,
  name: id,
  email: `${id}@example.com`,
  color: '#000000',
  role: 'editor',
  lastSeen: Date.now(),
  isOnline: true,
});

describe('buildUsersById', () => {
  it('returns an empty map for an empty array', () => {
    expect(buildUsersById([])).toEqual({});
  });

  it('maps each user id to the user object', () => {
    const u1 = makeUser('u1');
    const u2 = makeUser('u2');
    expect(buildUsersById([u1, u2])).toEqual({ u1, u2 });
  });

  it('overrides earlier entries when duplicate ids exist', () => {
    const first = makeUser('u1');
    const second = { ...first, name: 'Second' };
    expect(buildUsersById([first, second])).toEqual({ u1: second });
  });
});
