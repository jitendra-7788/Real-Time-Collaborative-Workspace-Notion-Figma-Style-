import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Workspace,
  DocumentItem,
  DocumentFolder,
  TaskItem,
  WorkspaceMember,
  NotificationItem,
  ActivityEvent,
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';
import { realtime } from '../services/socket.ts';

export type ActiveView = 'dashboard' | 'document' | 'tasks' | 'team' | 'settings';

interface WorkspaceContextType {
  workspaces: (Workspace & { membersCount: number; documentsCount: number; myRole: string })[];
  currentWorkspace: (Workspace & { membersCount?: number; documentsCount?: number; myRole?: string }) | null;
  setCurrentWorkspaceId: (id: string) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  activeDocId: string | null;
  setActiveDocId: (id: string | null) => void;
  documents: DocumentItem[];
  folders: DocumentFolder[];
  tasks: TaskItem[];
  members: WorkspaceMember[];
  notifications: NotificationItem[];
  activities: ActivityEvent[];
  isLoadingWorkspaceData: boolean;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  refreshWorkspaces: () => Promise<void>;
  refreshWorkspaceData: () => Promise<void>;
  createDocument: (title?: string, folderId?: string | null) => Promise<DocumentItem>;
  deleteDocument: (id: string) => Promise<void>;
  duplicateDocument: (id: string) => Promise<DocumentItem>;
  toggleFavorite: (id: string) => Promise<void>;
  createTask: (data: Partial<TaskItem>) => Promise<TaskItem>;
  updateTask: (taskId: string, data: Partial<TaskItem>) => Promise<TaskItem>;
  deleteTask: (taskId: string) => Promise<void>;
  createWorkspace: (name: string, description?: string, icon?: string) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<(Workspace & { membersCount: number; documentsCount: number; myRole: string })[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<(Workspace & { membersCount?: number; documentsCount?: number; myRole?: string }) | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoadingWorkspaceData, setIsLoadingWorkspaceData] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Load workspaces when user changes
  const refreshWorkspaces = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getWorkspaces();
      setWorkspaces(res.workspaces);
      if (res.workspaces.length > 0) {
        if (!currentWorkspace || !res.workspaces.some((w) => w.id === currentWorkspace.id)) {
          setCurrentWorkspace(res.workspaces[0]);
        } else {
          const updated = res.workspaces.find((w) => w.id === currentWorkspace.id);
          if (updated) setCurrentWorkspace(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  }, [user, currentWorkspace]);

  useEffect(() => {
    refreshWorkspaces();
  }, [user]);

  // Load workspace-specific details
  const refreshWorkspaceData = useCallback(async () => {
    if (!currentWorkspace) return;
    setIsLoadingWorkspaceData(true);
    try {
      const [docsRes, tasksRes, membersRes, foldersRes, notifsRes, actsRes] = await Promise.all([
        api.getDocuments(currentWorkspace.id),
        api.getTasks(currentWorkspace.id),
        api.getMembers(currentWorkspace.id),
        api.getFolders(currentWorkspace.id),
        api.getNotifications(currentWorkspace.id),
        api.getActivity(currentWorkspace.id),
      ]);

      setDocuments(docsRes.documents);
      setTasks(tasksRes.tasks);
      setMembers(membersRes.members);
      setFolders(foldersRes.folders);
      setNotifications(notifsRes.notifications);
      setActivities(actsRes.activities);
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setIsLoadingWorkspaceData(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (currentWorkspace) {
      refreshWorkspaceData();
    }
  }, [currentWorkspace?.id]);

  // Subscribe to real-time task updates
  useEffect(() => {
    const unsub = realtime.subscribe('task:changed', (msg) => {
      if (msg.payload?.workspaceId === currentWorkspace?.id) {
        setTasks((prev) => {
          const index = prev.findIndex((t) => t.id === msg.payload.task.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = msg.payload.task;
            return next;
          }
          return [msg.payload.task, ...prev];
        });
      }
    });
    return unsub;
  }, [currentWorkspace?.id]);

  const setCurrentWorkspaceId = (id: string) => {
    const ws = workspaces.find((w) => w.id === id);
    if (ws) {
      setCurrentWorkspace(ws);
      setActiveDocId(null);
      setActiveView('dashboard');
    }
  };

  const createDocument = async (title?: string, folderId?: string | null) => {
    if (!currentWorkspace) throw new Error('No workspace selected');
    const res = await api.createDocument(currentWorkspace.id, { title, folderId });
    setDocuments((prev) => [res.document, ...prev]);
    setActiveDocId(res.document.id);
    setActiveView('document');
    return res.document;
  };

  const deleteDocument = async (id: string) => {
    await api.deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (activeDocId === id) {
      setActiveDocId(null);
      setActiveView('dashboard');
    }
  };

  const duplicateDocument = async (id: string) => {
    const res = await api.duplicateDocument(id);
    setDocuments((prev) => [res.document, ...prev]);
    return res.document;
  };

  const toggleFavorite = async (id: string) => {
    const res = await api.toggleFavoriteDocument(id);
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isFavorite: res.isFavorite } : d))
    );
  };

  const createTask = async (data: Partial<TaskItem>) => {
    if (!currentWorkspace) throw new Error('No workspace selected');
    const res = await api.createTask(currentWorkspace.id, data);
    setTasks((prev) => [...prev, res.task]);
    realtime.sendTaskUpdate(currentWorkspace.id, res.task);
    return res.task;
  };

  const updateTask = async (taskId: string, data: Partial<TaskItem>) => {
    const res = await api.updateTask(taskId, data);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    if (currentWorkspace) {
      realtime.sendTaskUpdate(currentWorkspace.id, res.task);
    }
    return res.task;
  };

  const deleteTask = async (taskId: string) => {
    await api.deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const createWorkspace = async (name: string, description?: string, icon?: string) => {
    const res = await api.createWorkspace(name, description, icon);
    await refreshWorkspaces();
    setCurrentWorkspace(res.workspace);
    setActiveView('dashboard');
    return res.workspace;
  };

  const updateWorkspace = async (id: string, data: Partial<Workspace>) => {
    await api.updateWorkspace(id, data);
    await refreshWorkspaces();
  };

  const deleteWorkspace = async (id: string) => {
    await api.deleteWorkspace(id);
    await refreshWorkspaces();
  };

  const markNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsRead = async () => {
    if (!currentWorkspace) return;
    await api.markAllNotificationsRead(currentWorkspace.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspaceId,
        activeView,
        setActiveView,
        activeDocId,
        setActiveDocId,
        documents,
        folders,
        tasks,
        members,
        notifications,
        activities,
        isLoadingWorkspaceData,
        isSearchOpen,
        setIsSearchOpen,
        refreshWorkspaces,
        refreshWorkspaceData,
        createDocument,
        deleteDocument,
        duplicateDocument,
        toggleFavorite,
        createTask,
        updateTask,
        deleteTask,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return ctx;
};
