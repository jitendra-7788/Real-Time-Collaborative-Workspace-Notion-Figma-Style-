import React from 'react';
import {
  FileText,
  CheckSquare,
  Plus,
  Users,
  Clock,
  Star,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface DashboardViewProps {
  onOpenCreateDoc: () => void;
  onOpenCreateTask: () => void;
  onOpenInviteMember: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenCreateDoc,
  onOpenCreateTask,
  onOpenInviteMember,
}) => {
  const {
    currentWorkspace,
    documents,
    tasks,
    members,
    activities,
    setActiveDocId,
    setActiveView,
    toggleFavorite,
    updateTask,
  } = useWorkspace();
  const { user } = useAuth();

  const myTasks = tasks.filter((t) => t.assigneeId === user?.id);
  const openTasks = tasks.filter((t) => t.status !== 'done');
  const favoriteDocs = documents.filter((d) => d.isFavorite);
  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'high':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'medium':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-neutral-400 bg-neutral-800 border-neutral-700';
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-850 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-400">
            <span>Welcome back</span>
            <span aria-hidden="true">·</span>
            <span className="text-neutral-400 capitalize">{currentWorkspace?.name}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">
            Hello, {user?.name?.split(' ')[0] || 'Engineer'}
          </h1>
          <p className="text-sm text-neutral-400 max-w-xl">
            {currentWorkspace?.description ||
              'Real-time collaborative workspace for strategic documents, system specifications, and sprint execution.'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenCreateDoc}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Document</span>
          </button>
          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>Add Task</span>
          </button>
          <button
            onClick={onOpenInviteMember}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>Invite</span>
          </button>
        </div>
      </div>

      {/* Workspace Metric Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-400">Total Documents</div>
            <div className="text-xl font-bold font-mono tabular-nums text-neutral-100 mt-0.5">
              {documents.length}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-400">Open Sprint Tasks</div>
            <div className="text-xl font-bold font-mono tabular-nums text-neutral-100 mt-0.5">
              {openTasks.length}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-400">Collaborators</div>
            <div className="text-xl font-bold font-mono tabular-nums text-neutral-100 mt-0.5">
              {members.length}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-400">Assigned to You</div>
            <div className="text-xl font-bold font-mono tabular-nums text-neutral-100 mt-0.5">
              {myTasks.length}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Documents & Assigned Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Documents (2 spans) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-neutral-200">Recent Documents</h2>
              <span className="text-xs text-neutral-500 font-mono tabular-nums">({documents.length})</span>
            </div>
            <button
              onClick={() => onOpenCreateDoc()}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
            >
              + Create Document
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  setActiveDocId(doc.id);
                  setActiveView('document');
                }}
                className="group p-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer flex flex-col justify-between h-36"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-2xl">{doc.icon || '📄'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(doc.id);
                      }}
                      className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
                      title={doc.isFavorite ? 'Remove favorite' : 'Add favorite'}
                      aria-label="Toggle favorite"
                    >
                      <Star
                        className={`w-4 h-4 ${doc.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`}
                      />
                    </button>
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-200 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {doc.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center gap-1.5">
                    <span>{doc.wordCount} words</span>
                    <span aria-hidden="true">·</span>
                    <span>{doc.readingMinutes} min read</span>
                  </div>
                  <span className="font-mono text-[11px]">{formatRelativeTime(doc.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Assigned Tasks & Activity */}
        <div className="space-y-6">
          {/* Assigned Tasks Card */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-semibold text-neutral-200">My Priority Tasks</h2>
              </div>
              <button
                onClick={() => setActiveView('tasks')}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                View Board →
              </button>
            </div>

            <div className="space-y-2">
              {myTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-500">
                  No tasks assigned to you. Enjoy the focus time!
                </div>
              ) : (
                myTasks.slice(0, 4).map((task) => {
                  const isDone = task.status === 'done';
                  return (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800/80 flex items-start gap-2.5 group"
                    >
                      <button
                        onClick={() =>
                          updateTask(task.id, {
                            status: isDone ? 'in_progress' : 'done',
                          })
                        }
                        className={`mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-neutral-700 hover:border-neutral-500'
                        }`}
                        aria-label={`Toggle task completion: ${task.title}`}
                      >
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-medium truncate ${
                            isDone ? 'line-through text-neutral-500' : 'text-neutral-200'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span
                            className={`px-1.5 py-0.2 rounded border font-medium uppercase text-[9px] ${getPriorityStyle(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="text-neutral-500 flex items-center gap-1 font-mono">
                              <Calendar className="w-2.5 h-2.5" />
                              {task.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-semibold text-neutral-200">Recent Workspace Activity</h2>
            </div>

            <div className="space-y-3">
              {activities.slice(0, 4).map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs">
                  <img
                    src={act.userAvatar}
                    alt={act.userName}
                    className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-neutral-300 truncate">
                      <span className="font-semibold text-neutral-200">{act.userName}</span>{' '}
                      <span className="text-neutral-400">
                        {act.action === 'created_doc'
                          ? 'created document'
                          : act.action === 'edited_doc'
                          ? 'edited document'
                          : act.action === 'completed_task'
                          ? 'completed task'
                          : 'updated'}
                      </span>
                    </div>
                    <div className="text-[11px] text-blue-400 truncate font-medium">
                      {act.targetTitle}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      {formatRelativeTime(act.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
