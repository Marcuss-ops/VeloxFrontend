import { describe, it, expect } from 'vitest';
import {
  selectCommentsForObject,
  selectOnlineUsers,
  selectTasksByStatus,
  selectTasksForUser,
} from '@/lib/collaborationSelectors';
import type { User, Comment, Task } from '@/stores/collaborationStore';

const makeUser = (id: string, isOnline: boolean, lastSeen: number): User => ({
  id,
  name: id,
  email: `${id}@example.com`,
  color: '#000000',
  role: 'editor',
  lastSeen,
  isOnline,
});

const makeComment = (id: string, objectId?: string): Comment => ({
  id,
  text: `comment-${id}`,
  authorId: 'u1',
  objectId,
  timestamp: Date.now(),
  resolved: false,
  replies: [],
});

const makeTask = (id: string, assigneeId?: string, status: Task['status'] = 'pending'): Task => ({
  id,
  title: `task-${id}`,
  assigneeId,
  status,
  priority: 'medium',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

describe('selectOnlineUsers', () => {
  const now = 1000000;

  it('returns users that are online and seen within the threshold', () => {
    const online = makeUser('online', true, now - 1000);
    const offline = makeUser('offline', false, now - 1000);
    const stale = makeUser('stale', true, now - 300001);
    expect(selectOnlineUsers([online, offline, stale], now)).toEqual([online]);
  });

  it('returns an empty array when no users are online', () => {
    expect(selectOnlineUsers([], now)).toEqual([]);
  });

  it('excludes users exactly at the threshold boundary', () => {
    const user = makeUser('u', true, now - 300000);
    expect(selectOnlineUsers([user], now)).toEqual([]);
  });
});

describe('selectTasksForUser', () => {
  it('returns tasks assigned to the given user', () => {
    const t1 = makeTask('1', 'u1');
    const t2 = makeTask('2', 'u2');
    const t3 = makeTask('3', 'u1');
    expect(selectTasksForUser([t1, t2, t3], 'u1')).toEqual([t1, t3]);
  });

  it('returns an empty array for unassigned tasks when asked for a user', () => {
    const unassigned = makeTask('1', undefined);
    expect(selectTasksForUser([unassigned], 'u1')).toEqual([]);
  });
});

describe('selectTasksByStatus', () => {
  it('returns tasks matching the status', () => {
    const pending = makeTask('1', 'u1', 'pending');
    const completed = makeTask('2', 'u1', 'completed');
    expect(selectTasksByStatus([pending, completed], 'completed')).toEqual([completed]);
  });
});

describe('selectCommentsForObject', () => {
  it('returns comments linked to the object id', () => {
    const c1 = makeComment('1', 'obj-1');
    const c2 = makeComment('2', 'obj-2');
    const c3 = makeComment('3', 'obj-1');
    expect(selectCommentsForObject([c1, c2, c3], 'obj-1')).toEqual([c1, c3]);
  });

  it('returns an empty array when no comments match', () => {
    expect(selectCommentsForObject([makeComment('1', 'obj-2')], 'obj-1')).toEqual([]);
  });
});
