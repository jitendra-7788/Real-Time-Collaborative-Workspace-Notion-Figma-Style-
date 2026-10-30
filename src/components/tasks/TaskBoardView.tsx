import React, { useState } from 'react';
import {
  Kanban,
  List as ListIcon,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  MoreVertical,
  X,
  User as UserIcon,
  Tag,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { TaskItem, TaskPriority, TaskStatus, User } from '../../types/index.ts';

export const TaskBoardView: React.FC = () => {
  const {
    tasks,
    members,
    documents,
    createTask,
    updateTask,
    deleteTask,
    setActiveDocId,
    setActiveView,
  } = useWorkspace();
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Task creation/editing modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('');
  const [taskDueDate, setTaskDueDate] = useState<string>('');
  const [taskTags, setTaskTags] = useState<string>('');
  const [taskDocId, setTaskDocId] = useState<string>('');

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'border-neutral-700' },
    { id: 'in_progress', title: 'In Progress', color: 'border-blue-500' },
    { id: 'in_review', title: 'In Review', color: 'border-purple-500' },
    { id: 'done', title: 'Done', color: 'border-emerald-500' },
  ];

  // Filtering logic
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      const matchTag = task.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTag) return false;
    }
    if (selectedAssignee !== 'all') {
      if (task.assigneeId !== selectedAssignee) return false;
    }
    if (selectedPriority !== 'all') {
      if (task.priority !== selectedPriority) return false;
    }
    return true;
  });

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">Urgent</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">High</span>;
      case 'medium':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">Medium</span>;
      case 'low':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-neutral-800 text-neutral-400 border border-neutral-700">Low</span>;
    }
  };

  const handleOpenCreateModal = (defaultStatus: TaskStatus = 'todo') => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskStatus(defaultStatus);
    setTaskPriority('medium');
    setTaskAssigneeId(user?.id || '');
    setTaskDueDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
    setTaskTags('');
    setTaskDocId('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description);
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setTaskAssigneeId(task.assigneeId || '');
    setTaskDueDate(task.dueDate || '');
    setTaskTags(task.tags.join(', '));
    setTaskDocId(task.documentId || '');
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const tagsArray = taskTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingTask) {
      await updateTask(editingTask.id, {
        title: taskTitle,
        description: taskDescription,
        status: taskStatus,
        priority: taskPriority,
        assigneeId: taskAssigneeId || null,
        dueDate: taskDueDate || null,
        tags: tagsArray,
        documentId: taskDocId || null,
      });
    } else {
      await createTask({
        title: taskTitle,
        description: taskDescription,
        status: taskStatus,
        priority: taskPriority,
        assigneeId: taskAssigneeId || null,
        dueDate: taskDueDate || null,
        tags: tagsArray,
        documentId: taskDocId || null,
      });
    }
    setIsModalOpen(false);
  };

  const moveStatus = (task: TaskItem, newStatus: TaskStatus) => {
    updateTask(task.id, { status: newStatus });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100">Sprint Tasks & Kanban</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Real-time linear-style issue tracking and sprint workflow coordination.
          </p>
        </div>

        {/* View mode toggle & Create Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks by keyword, tag..."
            className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden"
          />
        </div>

        {/* Assignee filter */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-hidden"
          >
            <option value="all">All Assignees</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Filter className="w-3.5 h-3.5 text-neutral-500" />
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-hidden"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {(searchQuery || selectedAssignee !== 'all' || selectedPriority !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedAssignee('all');
              setSelectedPriority('all');
            }}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3.5 flex flex-col space-y-3 min-h-[450px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full border-2 ${col.color}`} />
                    <h3 className="text-xs font-semibold text-neutral-200">{col.title}</h3>
                    <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenCreateModal(col.id)}
                    className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800"
                    title={`Add task to ${col.title}`}
                    aria-label={`Add task to ${col.title}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 flex-1">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleOpenEditModal(task)}
                      className="group p-3 rounded-lg bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-neutral-200 group-hover:text-blue-400 transition-colors line-clamp-2">
                          {task.title}
                        </span>
                        {getPriorityBadge(task.priority)}
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Tags */}
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 font-mono"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Document Link if attached */}
                      {task.documentId && task.documentTitle && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDocId(task.documentId!);
                            setActiveView('document');
                          }}
                          className="flex items-center gap-1.5 text-[10px] text-blue-400 hover:underline truncate"
                        >
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate">{task.documentTitle}</span>
                        </div>
                      )}

                      {/* Footer: Due date & Assignee */}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-900 text-[10px] text-neutral-500">
                        {task.dueDate ? (
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            {task.dueDate}
                          </span>
                        ) : (
                          <span>No date</span>
                        )}

                        <div className="flex items-center gap-1.5">
                          {task.assignee ? (
                            <img
                              src={task.assignee.avatarUrl}
                              alt={task.assignee.name}
                              title={task.assignee.name}
                              className="w-5 h-5 rounded-full object-cover ring-1 ring-neutral-700"
                            />
                          ) : (
                            <span className="text-neutral-600 italic">Unassigned</span>
                          )}
                        </div>
                      </div>

                      {/* Quick Move Status Buttons on hover */}
                      <div className="pt-1.5 flex items-center justify-between border-t border-neutral-900/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-neutral-500">Move:</span>
                        <div className="flex items-center gap-1">
                          {columns
                            .filter((c) => c.id !== task.status)
                            .map((targetCol) => (
                              <button
                                key={targetCol.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveStatus(task, targetCol.id);
                                }}
                                className="px-1.5 py-0.5 rounded bg-neutral-850 hover:bg-neutral-800 text-[9px] text-neutral-300 font-medium"
                              >
                                {targetCol.title.split(' ')[0]}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="py-8 text-center text-xs text-neutral-600 italic border border-dashed border-neutral-800/80 rounded-lg">
                      No tasks in this lane
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List / Table View */}
      {viewMode === 'list' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/60 text-neutral-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => handleOpenEditModal(task)}
                  className="hover:bg-neutral-850/50 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-neutral-200 group-hover:text-blue-400">
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-[11px] text-neutral-500 line-clamp-1">{task.description}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 capitalize">
                    <span className="font-mono text-neutral-300">{task.status.replace('_', ' ')}</span>
                  </td>
                  <td className="py-3 px-4">{getPriorityBadge(task.priority)}</td>
                  <td className="py-3 px-4">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={task.assignee.avatarUrl}
                          alt={task.assignee.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="text-neutral-300">{task.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-neutral-500 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-400">
                    {task.dueDate || '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(task.id);
                      }}
                      className="text-neutral-500 hover:text-rose-400 p-1"
                      title="Delete task"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Creation & Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-semibold text-neutral-100">
                {editingTask ? 'Edit Sprint Task' : 'Create New Sprint Task'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement WebSocket heartbeat prober"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Detailed task goals, acceptance criteria, or technical details..."
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-hidden"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-hidden"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Assignee</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-hidden"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={taskTags}
                  onChange={(e) => setTaskTags(e.target.value)}
                  placeholder="e.g. Realtime, Frontend, Concurrency"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Link to Document (Optional)
                </label>
                <select
                  value={taskDocId}
                  onChange={(e) => setTaskDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-hidden"
                >
                  <option value="">None</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                {editingTask ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this task?')) {
                        deleteTask(editingTask.id);
                        setIsModalOpen(false);
                      }
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                  >
                    Delete Task
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {editingTask ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
