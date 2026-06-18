import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  lastSeen: number;
  isOnline: boolean;
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  objectId?: string; // Optional: comment on specific object
  position?: { x: number; y: number }; // Optional: position on canvas
  timestamp: number;
  resolved: boolean;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  text: string;
  authorId: string;
  timestamp: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
}

export interface CollaborationState {
  // Users
  users: User[];
  currentUser: User | null;
  
  // Comments
  comments: Comment[];
  
  // Tasks
  tasks: Task[];
  
  // Actions
  setCurrentUser: (user: User) => void;
  addUser: (user: Omit<User, 'lastSeen' | 'isOnline'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  removeUser: (userId: string) => void;
  
  addComment: (comment: Omit<Comment, 'id' | 'timestamp' | 'resolved' | 'replies'>) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  deleteComment: (commentId: string) => void;
  addCommentReply: (commentId: string, reply: Omit<CommentReply, 'id' | 'timestamp'>) => void;
  
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  assignTask: (taskId: string, userId: string) => void;
  
  // Real-time updates
  broadcastUpdate: (type: 'object' | 'comment' | 'task', data: any) => void;
  receiveUpdate: (type: 'object' | 'comment' | 'task', data: any) => void;
  
  // Getters
  getCommentsForObject: (objectId: string) => Comment[];
  getTasksForUser: (userId: string) => Task[];
  getTasksByStatus: (status: Task['status']) => Task[];
  getOnlineUsers: () => User[];
}

export const useCollaborationStore = create<CollaborationState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,
      comments: [],
      tasks: [],
      
      setCurrentUser: (user) => {
        set({ currentUser: { ...user, lastSeen: Date.now(), isOnline: true } });
      },
      
      addUser: (user) => {
        const newUser: User = {
          ...user,
          lastSeen: Date.now(),
          isOnline: true,
        };
        set((state) => ({
          users: [...state.users, newUser],
        }));
      },
      
      updateUser: (userId, updates) => {
        set((state) => ({
          users: state.users.map(user => 
            user.id === userId 
              ? { ...user, ...updates, lastSeen: Date.now() }
              : user
          ),
        }));
      },
      
      removeUser: (userId) => {
        set((state) => ({
          users: state.users.filter(user => user.id !== userId),
        }));
      },
      
      addComment: (comment) => {
        const newComment: Comment = {
          ...comment,
          id: Date.now().toString(),
          timestamp: Date.now(),
          resolved: false,
          replies: [],
        };
        
        set((state) => ({
          comments: [...state.comments, newComment],
        }));
      },
      
      updateComment: (commentId, updates) => {
        set((state) => ({
          comments: state.comments.map(comment => 
            comment.id === commentId 
              ? { ...comment, ...updates }
              : comment
          ),
        }));
      },
      
      deleteComment: (commentId) => {
        set((state) => ({
          comments: state.comments.filter(comment => comment.id !== commentId),
        }));
      },
      
      addCommentReply: (commentId, reply) => {
        const newReply: CommentReply = {
          ...reply,
          id: Date.now().toString(),
          timestamp: Date.now(),
        };
        
        set((state) => ({
          comments: state.comments.map(comment => 
            comment.id === commentId 
              ? { ...comment, replies: [...comment.replies, newReply] }
              : comment
          ),
        }));
      },
      
      addTask: (task) => {
        const newTask: Task = {
          ...task,
          id: Date.now().toString(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
      },
      
      updateTask: (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map(task => 
            task.id === taskId 
              ? { ...task, ...updates, updatedAt: Date.now() }
              : task
          ),
        }));
      },
      
      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter(task => task.id !== taskId),
        }));
      },
      
      assignTask: (taskId, userId) => {
        set((state) => ({
          tasks: state.tasks.map(task => 
            task.id === taskId 
              ? { ...task, assigneeId: userId }
              : task
          ),
        }));
      },
      
      broadcastUpdate: (type, data) => {
        // This would integrate with WebSocket or similar real-time technology
        console.log(`Broadcasting ${type} update:`, data);
      },
      
      receiveUpdate: (type, data) => {
        // Handle incoming real-time updates
        console.log(`Received ${type} update:`, data);
        
        switch (type) {
          case 'object':
            // Handle object updates from other users
            break;
          case 'comment':
            // Handle new comments
            if (data.action === 'add') {
              get().addComment(data.comment);
            } else if (data.action === 'update') {
              get().updateComment(data.commentId, data.updates);
            }
            break;
          case 'task':
            // Handle task updates
            if (data.action === 'add') {
              get().addTask(data.task);
            } else if (data.action === 'update') {
              get().updateTask(data.taskId, data.updates);
            }
            break;
        }
      },
      
      getCommentsForObject: (objectId) => {
        const { comments } = get();
        return comments.filter(comment => comment.objectId === objectId);
      },
      
      getTasksForUser: (userId) => {
        const { tasks } = get();
        return tasks.filter(task => task.assigneeId === userId);
      },
      
      getTasksByStatus: (status) => {
        const { tasks } = get();
        return tasks.filter(task => task.status === status);
      },
      
      getOnlineUsers: () => {
        const { users } = get();
        const now = Date.now();
        return users.filter(user => user.isOnline && (now - user.lastSeen) < 300000); // 5 minutes
      },
    }),
    {
      name: 'dark-editor-collaboration',
      partialize: (state) => ({
        users: state.users,
        comments: state.comments,
        tasks: state.tasks,
      }),
    }
  )
);