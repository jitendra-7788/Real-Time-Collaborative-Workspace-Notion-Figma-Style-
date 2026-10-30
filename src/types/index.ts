export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  roleTitle: string; // e.g. "Lead Systems Architect"
  color: string; // hex color for presence cursor & avatars
  bio?: string;
  createdAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
  user: User;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string; // emoji or icon key
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  membersCount?: number;
  documentsCount?: number;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface DocumentFolder {
  id: string;
  workspaceId: string;
  name: string;
  icon: string;
  parentFolderId?: string | null;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  title: string;
  content: string;
  updatedBy: string;
  updatedByUser?: User;
  createdAt: string;
  summary?: string;
}

export interface DocumentItem {
  id: string;
  workspaceId: string;
  title: string;
  content: string; // HTML rich text
  icon: string;
  coverUrl?: string;
  folderId?: string | null;
  isFavorite: boolean;
  createdBy: string;
  createdByUser?: User;
  updatedBy: string;
  updatedByUser?: User;
  version: number;
  wordCount: number;
  readingMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  parentCommentId?: string | null;
  userId: string;
  user: User;
  content: string;
  isResolved: boolean;
  selectedText?: string;
  createdAt: string;
  updatedAt: string;
  replies?: DocumentComment[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskItem {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  assignee?: User | null;
  creatorId: string;
  creator?: User;
  dueDate?: string | null;
  tags: string[];
  documentId?: string | null;
  documentTitle?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  workspaceId: string;
  type: 'invite' | 'task_assigned' | 'comment' | 'mention' | 'doc_shared' | 'doc_update';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CollaboratorPresence {
  userId: string;
  name: string;
  avatarUrl: string;
  color: string;
  roleTitle: string;
  documentId: string;
  lastActive: number;
  cursor?: {
    blockId?: string;
    textOffset?: number;
    userName?: string;
  };
  isTyping?: boolean;
}

export interface ActivityEvent {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: 'created_doc' | 'edited_doc' | 'created_task' | 'completed_task' | 'commented' | 'joined_workspace';
  targetTitle: string;
  targetId: string;
  targetType: 'document' | 'task' | 'comment' | 'workspace';
  timestamp: string;
}
