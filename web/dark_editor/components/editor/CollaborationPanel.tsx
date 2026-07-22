import React, { useState, useEffect, useMemo } from 'react';
import { useCollaborationStore, User, Comment, Task } from '@/stores/collaborationStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { buildUsersById } from '@/lib/collaborationUsers';
import { 
  Users, 
  MessageSquare, 
  CheckSquare, 
  Plus, 
  UserPlus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Send,
  Reply,
  Calendar,
  Clock,
  User as UserIcon,
  Dot,
  MessageCircle,
  CheckCircle,
  Circle,
  Flag,
  AlertCircle
} from 'lucide-react';

export default function CollaborationPanel() {
  const { 
    users, 
    currentUser, 
    comments, 
    tasks, 
    setCurrentUser, 
    addUser, 
    updateUser, 
    addComment, 
    addTask, 
    updateTask, 
    assignTask, 
    getOnlineUsers, 
    getTasksForUser, 
    getTasksByStatus 
  } = useCollaborationStore();
  
  const { selectedIds } = useEditorStore();
  const { addToast } = useUIStore();
  
  const [activeTab, setActiveTab] = useState<'users' | 'comments' | 'tasks'>('users');
  const [commentText, setCommentText] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Build an lookup map so repeated author resolution is O(1) instead of O(n)
  const usersById = useMemo(() => buildUsersById(users), [users]);

  const selectedObjectId = selectedIds[0] || null;
  const objectComments = useCollaborationStore((state) => state.getCommentsForObject(selectedObjectId || ''));
  const userTasks = currentUser ? getTasksForUser(currentUser.id) : [];
  const onlineUsers = getOnlineUsers();
  
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
  
  const handleAddTask = () => {
    if (!taskTitle.trim() || !currentUser) return;
    
    addTask({
      title: taskTitle,
      description: taskDescription,
      assigneeId: taskAssignee || currentUser.id,
      status: 'pending',
      priority: taskPriority,
    });
    
    setTaskTitle('');
    setTaskDescription('');
    setShowTaskForm(false);
    addToast({
      type: 'success',
      message: 'Task created successfully',
    });
  };
  
  const handleAssignTask = (taskId: string, userId: string) => {
    assignTask(taskId, userId);
    addToast({
      type: 'success',
      message: 'Task assigned successfully',
    });
  };
  
  const handleUpdateTaskStatus = (taskId: string, status: Task['status']) => {
    updateTask(taskId, { status });
    addToast({
      type: 'success',
      message: 'Task status updated',
    });
  };
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'in_progress': return 'text-blue-500';
      case 'pending': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sidebar-section">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h3 className="sidebar-section-title">Collaboration</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Dot className="w-3 h-3 text-green-500" />
              {onlineUsers.length} online
            </div>
            {currentUser && (
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: currentUser.color }}
                />
                <span className="text-xs text-slate-600 dark:text-slate-300">{currentUser.name}</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Real-time collaboration and project management
        </p>
      </div>
      
      {/* Tabs */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4 mx-auto mb-1" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'comments'
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4 mx-auto mb-1" />
            Comments
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'tasks'
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <CheckSquare className="w-4 h-4 mx-auto mb-1" />
            Tasks
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Users Tab */}
        {activeTab === 'users' && (
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
              <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300">All Users</h4>
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
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
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.isOnline ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                      'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {user.isOnline ? 'Online' : 'Offline'}
                    </span>
                    <span className="text-xs text-slate-500">{user.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="space-y-3">
            {selectedObjectId && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-xs text-slate-500">Comments for selected object</span>
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
                Comments {selectedObjectId ? `(${objectComments.length})` : `(${comments.length})`}
              </h4>
              
              {(selectedObjectId ? objectComments : comments).map((comment) => (
                <div key={comment.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: usersById[comment.authorId]?.color || '#ccc' }}
                      >
                        {usersById[comment.authorId]?.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{usersById[comment.authorId]?.name}</div>
                        <div className="text-xs text-slate-500">{formatTime(comment.timestamp)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {comment.resolved && <CheckCircle className="w-4 h-4 text-green-500" />}
                      <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                        <Reply className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{comment.text}</p>
                  
                  {/* Replies */}
                  {comment.replies.length > 0 && (
                    <div className="space-y-2 mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-2 pl-8">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: usersById[reply.authorId]?.color || '#ccc' }}
                          >
                            {usersById[reply.authorId]?.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{usersById[reply.authorId]?.name}</span>
                              <span>•</span>
                              <span>{formatTime(reply.timestamp)}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{reply.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {/* User Tasks */}
            {currentUser && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300">Your Tasks</h4>
                  <button
                    onClick={() => setShowTaskForm(!showTaskForm)}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    {showTaskForm ? 'Hide Form' : 'Add Task'}
                  </button>
                </div>
                
                {showTaskForm && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                    <input
                      type="text"
                      placeholder="Task title..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded"
                    />
                    <textarea
                      placeholder="Task description (optional)..."
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded resize-none"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                        className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                      <select
                        value={taskAssignee}
                        onChange={(e) => setTaskAssignee(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded"
                      >
                        <option value="">Assign to...</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddTask}
                        className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold"
                      >
                        Create Task
                      </button>
                      <button
                        onClick={() => setShowTaskForm(false)}
                        className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  {userTasks.map((task) => (
                    <TaskCard key={task.id} task={task} usersById={usersById} onAssign={handleAssignTask} onUpdateStatus={handleUpdateTaskStatus} />
                  ))}
                </div>
              </div>
            )}
            
            {/* All Tasks */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300">All Tasks</h4>
              
              <div className="space-y-2">
                {getTasksByStatus('pending').map((task) => (
                  <TaskCard key={task.id} task={task} usersById={usersById} onAssign={handleAssignTask} onUpdateStatus={handleUpdateTaskStatus} />
                ))}
                {getTasksByStatus('in_progress').map((task) => (
                  <TaskCard key={task.id} task={task} usersById={usersById} onAssign={handleAssignTask} onUpdateStatus={handleUpdateTaskStatus} />
                ))}
                {getTasksByStatus('completed').map((task) => (
                  <TaskCard key={task.id} task={task} usersById={usersById} onAssign={handleAssignTask} onUpdateStatus={handleUpdateTaskStatus} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({
  task,
  usersById,
  onAssign,
  onUpdateStatus
}: {
  task: Task;
  usersById: Record<string, User>;
  onAssign: (taskId: string, userId: string) => void;
  onUpdateStatus: (taskId: string, status: Task['status']) => void;
}) {
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

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-green-500';
    default: return 'text-gray-500';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'text-green-500';
    case 'in_progress': return 'text-blue-500';
    case 'pending': return 'text-gray-500';
    default: return 'text-gray-500';
  }
}