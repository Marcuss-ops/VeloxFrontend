import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCollaborationStore, User } from '@/stores/collaborationStore';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  } as Storage;
}

describe('useCollaborationStore getters', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock());
    useCollaborationStore.setState({
      users: [],
      currentUser: null,
      comments: [],
      tasks: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const makeUser = (id: string, lastSeen: number, isOnline: boolean): User => ({
    id,
    name: id,
    email: `${id}@example.com`,
    color: '#000000',
    role: 'editor',
    lastSeen,
    isOnline,
  });

  it('getTasksForUser returns only tasks assigned to the user', () => {
    const store = useCollaborationStore.getState();
    store.addTask({ title: 'T1', assigneeId: 'u1', status: 'pending', priority: 'medium' });
    store.addTask({ title: 'T2', assigneeId: 'u2', status: 'pending', priority: 'medium' });
    const result = store.getTasksForUser('u1');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('T1');
  });

  it('getTasksByStatus filters by status', () => {
    const store = useCollaborationStore.getState();
    store.addTask({ title: 'Pending', assigneeId: 'u1', status: 'pending', priority: 'medium' });
    store.addTask({ title: 'Completed', assigneeId: 'u1', status: 'completed', priority: 'medium' });
    const result = store.getTasksByStatus('completed');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Completed');
  });

  it('getOnlineUsers respects the 5-minute threshold', () => {
    const now = Date.now();
    useCollaborationStore.setState({
      users: [
        makeUser('online', now - 1000, true),
        makeUser('stale', now - 400000, true),
        makeUser('offline', now - 1000, false),
      ],
    });
    const result = useCollaborationStore.getState().getOnlineUsers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('online');
  });

  it('getCommentsForObject returns only matching object comments', () => {
    const store = useCollaborationStore.getState();
    store.addComment({ text: 'c1', authorId: 'u1', objectId: 'obj-1' });
    store.addComment({ text: 'c2', authorId: 'u1', objectId: 'obj-2' });
    store.addComment({ text: 'c3', authorId: 'u1' });
    const result = store.getCommentsForObject('obj-1');
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('c1');
  });
});
