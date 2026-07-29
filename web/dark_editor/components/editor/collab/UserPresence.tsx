// components/editor/collab/UserPresence.tsx — Users tab UI for the
// collaboration panel.
//
// Extracted from components/editor/CollaborationPanel.tsx (commit 4 of 4
// in the collab refactor). Originally the inline `{activeTab === 'users' &&
// (...)}` block inside CollaborationPanel — now lives in its own focused
// module so the users tab UI can be tested + composed independently.
//
// Self-contained: reads all data from stores internally (useCollaborationStore
// for users + addUser, useUIStore for addToast). No props required — the
// orchestrator just renders <UserPresence /> when the users tab is active.
//
// Behavior is byte-identical to the original inline block:
//   - "Add User" button at the top with full-width primary styling.
//   - User list below: avatar circle (color from user.color) + name + email
//     + online/offline badge + role badge.
//   - handleAddUser uses window.prompt() for name + email (matches original).

'use client';

import React from 'react';
import { UserPlus } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useUIStore } from '@/stores/uiStore';

export function UserPresence() {
  const { users, addUser } = useCollaborationStore();
  const { addToast } = useUIStore();

  const handleAddUser = () => {
    const name = prompt('Enter user name:');
    const email = prompt('Enter user email:');
    if (!name || !email) return;

    const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
    addUser({
      id: Date.now().toString(),
      name,
      email,
      color,
      role: 'editor',
    });

    addToast({
      type: 'success',
      message: `User ${name} added successfully`,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={handleAddUser}
          className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300">
          All Users
        </h4>
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: user.color }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-sm">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  user.isOnline
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {user.isOnline ? 'Online' : 'Offline'}
              </span>
              <span className="text-xs text-slate-500">{user.role}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
