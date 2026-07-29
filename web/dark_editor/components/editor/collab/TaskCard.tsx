// components/editor/collab/TaskCard.tsx — Single task card UI for the
// collaboration panel.
//
// Extracted from components/editor/CollaborationPanel.tsx (commit 2 of 4 in
// the collab refactor). Originally an inline non-exported function used only
// inside CollaborationPanel — now lives in its own focused module so the task
// card rendering can be tested + composed independently.
//
// Behavior is byte-identical to the original inline version: the same 4 props
// (task, usersById, onAssign, onUpdateStatus), the same JSX layout, the same
// Tailwind class strings. The only changes are:
//   - Added `export` so the function can be imported by other collab modules
//     (CollaborationPanel uses it; future tests will too).
//   - Imports getPriorityColor + getStatusColor from ./colors (sibling module,
//     extracted in commit 1 of this series).
//   - Imports CheckCircle, Circle, Flag icons from lucide-react (same as the
//     inline version relied on the file-level import).
//
// The component is a pure presentational function — no hooks, no state, no
// store imports. All data flows in via props.
//
// 'use client' directive: TaskCard uses JSX + onClick handlers, so it must
// be a client component in the Next.js App Router. CollaborationPanel.tsx
// (the only current consumer) is itself a client component (uses useState +
// useEffect + useMemo) and is treated as such via its call chain, so this
// file would render correctly without the directive. We add it explicitly
// anyway so the module is portable to any future server-component consumer.

'use client';

import React from 'react';
import { CheckCircle, Circle, Flag } from 'lucide-react';
import type { Task, User } from '@/stores/collaborationStore';
import { getPriorityColor, getStatusColor } from './colors';

export interface TaskCardProps {
  task: Task;
  usersById: Record<string, User>;
  onAssign: (taskId: string, userId: string) => void;
  onUpdateStatus: (taskId: string, status: Task['status']) => void;
}

export function TaskCard({
  task,
  usersById,
  onAssign,
  onUpdateStatus,
}: TaskCardProps) {
  const assignee = usersById[task.assigneeId || ''];

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
            className={`p-1 rounded ${
              task.status === 'completed' ? 'text-green-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            {task.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
          </button>
          <div>
            <h4 className="font-medium text-sm">{task.title}</h4>
            {task.description && (
              <p className="text-xs text-slate-500 mt-1">{task.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
            <Flag className="w-3 h-3 inline mr-1" />
            {task.priority}
          </span>
          <span className={`text-xs font-medium ${getStatusColor(task.status)}`}>
            {task.status}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {assignee && (
            <>
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: assignee.color }}
              />
              <span>{assignee.name}</span>
            </>
          )}
          <span>•</span>
          <span>{new Date(task.createdAt).toLocaleDateString()}</span>
        </div>

        {task.status !== 'completed' && (
          <select
            value={task.assigneeId || ''}
            onChange={(e) => onAssign(task.id, e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700"
          >
            <option value="">Assign to...</option>
            {Object.values(usersById).map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
