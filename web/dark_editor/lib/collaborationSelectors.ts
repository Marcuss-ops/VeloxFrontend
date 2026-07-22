import type { User, Comment, Task } from '@/stores/collaborationStore';

export const ONLINE_THRESHOLD_MS = 300000; // 5 minutes

/**
 * Return users that are marked online and have been seen within the threshold.
 */
export function selectOnlineUsers(users: User[], now: number): User[] {
  return users.filter((user) => user.isOnline && now - user.lastSeen < ONLINE_THRESHOLD_MS);
}

/**
 * Return tasks assigned to a specific user.
 */
export function selectTasksForUser(tasks: Task[], userId: string): Task[] {
  return tasks.filter((task) => task.assigneeId === userId);
}

/**
 * Return tasks filtered by status.
 */
export function selectTasksByStatus(tasks: Task[], status: Task['status']): Task[] {
  return tasks.filter((task) => task.status === status);
}

/**
 * Return comments linked to a specific object.
 */
export function selectCommentsForObject(comments: Comment[], objectId: string): Comment[] {
  return comments.filter((comment) => comment.objectId === objectId);
}
