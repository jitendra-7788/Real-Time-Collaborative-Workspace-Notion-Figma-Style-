import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  Settings,
  Plus,
  Star,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useWorkspace, ActiveView } from '../../context/WorkspaceContext.tsx';
import { getRoleBadgeColor } from '../../utils/permissions.ts';

interface SidebarProps {
  onOpenCreateDoc: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenCreateDoc }) => {
  const {
    currentWorkspace,
    activeView,
    setActiveView,
    documents,
    folders,
    activeDocId,
    setActiveDocId,
    createDocument,
  } = useWorkspace();

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    fld_architecture: true,
    fld_roadmap: true,
  });

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const favoriteDocs = documents.filter((d) => d.isFavorite);
  const recentDocs = [...documents].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 5);

  const navItems = [
    { id: 'dashboard' as ActiveView, label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks' as ActiveView, label: 'Tasks & Kanban', icon: CheckSquare },
    { id: 'team' as ActiveView, label: 'Team & Roles', icon: Users },
    { id: 'settings' as ActiveView, label: 'Settings', icon: Settings },
  ];

  const handleSelectDoc = (id: string) => {
    setActiveDocId(id);
    setActiveView('document');
  };

  return (
    <aside className="w-64 h-[calc(100vh-3.5rem)] bg-neutral-950 border-r border-neutral-800 flex flex-col justify-between shrink-0 select-none">
      {/* Top Section */}
      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        {/* Workspace Quick Card */}
        <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">{currentWorkspace?.icon || '⚡'}</span>
            <div className="truncate">
              <div className="text-xs font-bold text-neutral-100 truncate">{currentWorkspace?.name}</div>
              <div className="text-[10px] text-neutral-400 capitalize truncate">
                Role: <span className="text-blue-400">{currentWorkspace?.myRole || 'member'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onOpenCreateDoc}
            className="p-1 rounded-md bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 transition-colors cursor-pointer"
            title="Create new document"
            aria-label="Create new document"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  if (item.id !== 'document') {
                    setActiveDocId(null);
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-neutral-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Favorites */}
        {favoriteDocs.length > 0 && (
          <div>
            <div className="px-3 py-1 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              <Star className="w-3 h-3 text-amber-500/80" />
              <span>Favorites</span>
            </div>
            <div className="space-y-0.5 mt-1">
              {favoriteDocs.map((doc) => {
                const isDocActive = activeView === 'document' && activeDocId === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-colors truncate cursor-pointer ${
                      isDocActive
                        ? 'bg-blue-600/15 text-blue-300 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                    }`}
                  >
                    <span className="shrink-0">{doc.icon || '📄'}</span>
                    <span className="truncate">{doc.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Folders and Documents Tree */}
        <div>
          <div className="px-3 py-1 flex items-center justify-between text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            <span>Workspace Docs</span>
            <button
              onClick={() => createDocument('New Document')}
              className="text-neutral-500 hover:text-neutral-300 cursor-pointer"
              aria-label="Add document"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1 mt-1">
            {folders.map((folder) => {
              const isExpanded = !!expandedFolders[folder.id];
              const folderDocs = documents.filter((d) => d.folderId === folder.id);
              return (
                <div key={folder.id} className="space-y-0.5">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      )}
                      <span>{folder.icon}</span>
                      <span className="truncate font-medium text-neutral-300">{folder.name}</span>
                    </div>
                    <span className="text-[10px] text-neutral-600 group-hover:text-neutral-400">
                      {folderDocs.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="pl-6 space-y-0.5 border-l border-neutral-800/80 ml-3.5">
                      {folderDocs.map((doc) => {
                        const isDocActive = activeView === 'document' && activeDocId === doc.id;
                        return (
                          <button
                            key={doc.id}
                            onClick={() => handleSelectDoc(doc.id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors truncate cursor-pointer ${
                              isDocActive
                                ? 'bg-blue-600/15 text-blue-300 font-semibold'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                            }`}
                          >
                            <span className="shrink-0">{doc.icon || '📄'}</span>
                            <span className="truncate">{doc.title}</span>
                          </button>
                        );
                      })}
                      {folderDocs.length === 0 && (
                        <div className="px-2.5 py-1 text-[11px] text-neutral-600 italic">Empty folder</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized documents */}
            {documents
              .filter((d) => !d.folderId)
              .map((doc) => {
                const isDocActive = activeView === 'document' && activeDocId === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-colors truncate cursor-pointer ${
                      isDocActive
                        ? 'bg-blue-600/15 text-blue-300 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                    }`}
                  >
                    <span className="shrink-0">{doc.icon || '📄'}</span>
                    <span className="truncate">{doc.title}</span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="p-3 border-t border-neutral-800/80 bg-neutral-950/60">
        <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1.5">
          <span>Documents: {documents.length}</span>
          <span>Sprints: Active</span>
        </div>
        <button
          onClick={() => createDocument('Sprint Spec & Notes')}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span>New Document</span>
        </button>
      </div>
    </aside>
  );
};
