// components/editor/collab/colors.ts — Priority + status color maps for the
// collaboration panel.
//
// Extracted from components/editor/CollaborationPanel.tsx (commit 1 of 4 in
// the collab refactor) so the priority/status color logic lives in its own
// focused module and can be consumed by any collab sub-component (TaskCard
// in commit 2 is the first consumer; CommentSection / UserPresence may
// follow).
//
// Both helpers are pure functions of a single string argument and return a
// Tailwind CSS class string. No React/JSX, no store, no hooks — just two
// switch expressions so this file can be imported from anywhere in the
// collab module tree without pulling in heavy deps.

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-500';
    case 'in_progress':
      return 'text-blue-500';
    case 'pending':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
}
