import {
  User,
  Workspace,
  WorkspaceMember,
  DocumentItem,
  DocumentVersion,
  DocumentFolder,
  TaskItem,
  DocumentComment,
  NotificationItem,
  ActivityEvent,
} from '../types/index.ts';

const TOKEN_KEY = 'kortex_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Network error occurred' }));
    throw new Error(errorBody.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string, roleTitle?: string) =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, roleTitle }),
    }),

  getMe: () => request<{ user: User }>('/auth/me'),

  getDemoUsers: () => request<{ users: User[] }>('/auth/demo-users'),

  switchDemoUser: (userId: string) =>
    request<{ user: User; token: string }>('/auth/switch-demo', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  updateProfile: (data: Partial<User>) =>
    request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  resetPassword: (email: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Workspaces
  getWorkspaces: () => request<{ workspaces: (Workspace & { membersCount: number; documentsCount: number; myRole: string })[] }>('/workspaces'),

  createWorkspace: (name: string, description?: string, icon?: string) =>
    request<{ workspace: Workspace }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description, icon }),
    }),

  updateWorkspace: (id: string, data: Partial<Workspace>) =>
    request<{ workspace: Workspace }>(`/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteWorkspace: (id: string) =>
    request<{ message: string }>(`/workspaces/${id}`, {
      method: 'DELETE',
    }),

  // Workspace Members
  getMembers: (workspaceId: string) =>
    request<{ members: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`),

  inviteMember: (workspaceId: string, email: string, role: string) =>
    request<{ message: string }>(`/workspaces/${workspaceId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  updateMemberRole: (workspaceId: string, userId: string, role: string) =>
    request<{ member: WorkspaceMember }>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  removeMember: (workspaceId: string, userId: string) =>
    request<{ message: string }>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
    }),

  // Documents
  getDocuments: (workspaceId: string) =>
    request<{ documents: DocumentItem[] }>(`/workspaces/${workspaceId}/documents`),

  getDocument: (id: string) =>
    request<{ document: DocumentItem }>(`/documents/${id}`),

  createDocument: (workspaceId: string, data?: Partial<DocumentItem>) =>
    request<{ document: DocumentItem }>(`/workspaces/${workspaceId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  updateDocument: (id: string, data: Partial<DocumentItem>) =>
    request<{ document: DocumentItem }>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  duplicateDocument: (id: string) =>
    request<{ document: DocumentItem }>(`/documents/${id}/duplicate`, {
      method: 'POST',
    }),

  toggleFavoriteDocument: (id: string) =>
    request<{ isFavorite: boolean }>(`/documents/${id}/favorite`, {
      method: 'POST',
    }),

  deleteDocument: (id: string) =>
    request<{ message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    }),

  getDocumentVersions: (id: string) =>
    request<{ versions: DocumentVersion[] }>(`/documents/${id}/versions`),

  restoreDocumentVersion: (id: string, versionId: string) =>
    request<{ document: DocumentItem }>(`/documents/${id}/restore-version`, {
      method: 'POST',
      body: JSON.stringify({ versionId }),
    }),

  // Comments
  getComments: (documentId: string) =>
    request<{ comments: DocumentComment[] }>(`/documents/${documentId}/comments`),

  createComment: (documentId: string, content: string, parentCommentId?: string, selectedText?: string) =>
    request<{ comment: DocumentComment }>(`/documents/${documentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentCommentId, selectedText }),
    }),

  resolveComment: (commentId: string, isResolved?: boolean) =>
    request<{ comment: DocumentComment }>(`/comments/${commentId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ isResolved }),
    }),

  deleteComment: (commentId: string) =>
    request<{ message: string }>(`/comments/${commentId}`, {
      method: 'DELETE',
    }),

  // Tasks
  getTasks: (workspaceId: string) =>
    request<{ tasks: TaskItem[] }>(`/workspaces/${workspaceId}/tasks`),

  createTask: (workspaceId: string, data: Partial<TaskItem>) =>
    request<{ task: TaskItem }>(`/workspaces/${workspaceId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (taskId: string, data: Partial<TaskItem>) =>
    request<{ task: TaskItem }>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (taskId: string) =>
    request<{ message: string }>(`/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  // Folders
  getFolders: (workspaceId: string) =>
    request<{ folders: DocumentFolder[] }>(`/workspaces/${workspaceId}/folders`),

  createFolder: (workspaceId: string, name: string, icon?: string) =>
    request<{ folder: DocumentFolder }>(`/workspaces/${workspaceId}/folders`, {
      method: 'POST',
      body: JSON.stringify({ name, icon }),
    }),

  // Notifications
  getNotifications: (workspaceId: string) =>
    request<{ notifications: NotificationItem[] }>(`/workspaces/${workspaceId}/notifications`),

  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllNotificationsRead: (workspaceId: string) =>
    request<{ success: boolean }>(`/workspaces/${workspaceId}/notifications/read-all`, {
      method: 'PUT',
    }),

  // Search
  search: (workspaceId: string, query: string) =>
    request<{ documents: DocumentItem[]; tasks: TaskItem[]; members: User[] }>(
      `/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`
    ),

  // Activity
  getActivity: (workspaceId: string) =>
    request<{ activities: ActivityEvent[] }>(`/workspaces/${workspaceId}/activity`),
};
