import type { User } from '@/stores/collaborationStore';

/**
 * Build an O(1) lookup map from a users array.
 */
export function buildUsersById(users: User[]): Record<string, User> {
  const map: Record<string, User> = {};
  for (const user of users) {
    map[user.id] = user;
  }
  return map;
}
