// components/editor/collab/CommentSection.tsx — Comments tab UI for the
// collaboration panel.
//
// Extracted from components/editor/CollaborationPanel.tsx (commit 3 of 4 in
// the collab refactor). Originally the inline `{activeTab === 'comments' &&
// (...)}` block inside CollaborationPanel — now lives in its own focused
// module so the comments UI can be tested + composed independently.
//
// Self-contained: reads all data from stores internally (useCollaborationStore
// for currentUser/comments/addComment, useEditorStore for selectedIds, and
// useUIStore for addToast). No props needed — the orchestrator just renders
// <CommentSection /> when the comments tab is active.
//
// Behavior is byte-identical to the original inline block:
//   - Selected-object banner shown only when an object is selected.
//   - Comment input that submits on Enter or Send click (disabled until the
//     user has typed something AND has a currentUser).
//   - "Comments (N)" count header that respects object-scoped vs global list.
//   - Per-comment card with author avatar + name + timestamp + Reply button +
//     resolved checkmark when comment.resolved is true.
//   - Nested replies indented with smaller avatars + same formatTime helper.

'use client';

import React, { useState, useMemo } from 'react';
import { Send, Reply, CheckCircle } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { buildUsersById } from '@/lib/collaborationUsers';

export function CommentSection() {
  const { users, comments, currentUser, addComment } = useCollaborationStore();
  const { selectedIds } = useEditorStore();
  const { addToast } = useUIStore();

  const [commentText, setCommentText] = useState('');
  const selectedObjectId = selectedIds[0] || null;
  const usersById = useMemo(() => buildUsersById(users), [users]);
  const objectComments = useCollaborationStore((state) =>
    state.getCommentsForObject(selectedObjectId || '')
  );

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !currentUser) return;

    addComment({
      text: commentText,
      authorId: currentUser.id,
      objectId: selectedObjectId || undefined,
    });

    setCommentText('');
    addToast({
      type: 'success',
      message: 'Comment added successfully',
    });
  };

  return (
    <div className="space-y-3">
      {selectedObjectId && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <span className="text-xs text-slate-500">
            Comments for selected object
          </span>
        </div>
      )}

      {/* Add Comment */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
          />
          <button
            onClick={handleAddComment}
            disabled={!commentText.trim() || !currentUser}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Comments{' '}
          {selectedObjectId ? `(${objectComments.length})` : `(${comments.length})`}
        </h4>

        {(selectedObjectId ? objectComments : comments).map((comment) => (
          <div
            key={comment.id}
            className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{
                    backgroundColor:
                      usersById[comment.authorId]?.color || '#ccc',
                  }}
                >
                  {usersById[comment.authorId]?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {usersById[comment.authorId]?.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatTime(comment.timestamp)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {comment.resolved && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                  <Reply className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
              {comment.text}
            </p>

            {/* Replies */}
            {comment.replies.length > 0 && (
              <div className="space-y-2 mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                {comment.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="flex items-start gap-2 pl-8"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{
                        backgroundColor:
                          usersById[reply.authorId]?.color || '#ccc',
                      }}
                    >
                      {usersById[reply.authorId]?.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{usersById[reply.authorId]?.name}</span>
                        <span>•</span>
                        <span>{formatTime(reply.timestamp)}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {reply.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
