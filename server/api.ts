import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, saveDb } from './db.ts';
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
} from '../src/types/index.ts';

const router = express.Router();

// Helper to get authenticated user from header
function getAuthUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  const db = getDb();
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const userId = authHeader.replace('Bearer ', '').trim();
    const user = db.users.find((u) => u.id === userId);
    if (user) return user;
  }
  // Default to Elena (Lead Architect) if not specified
  return db.users[0] || null;
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const userWithHash = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!userWithHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = bcrypt.compareSync(password, userWithHash.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { passwordHash, ...user } = userWithHash;
  return res.json({ user, token: user.id });
});

router.post('/auth/register', (req: Request, res: Response) => {
  const { name, email, password, roleTitle } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  const db = getDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const colors = ['#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#f59e0b', '#06b6d4'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const newUser = {
    id: `usr_${Date.now()}`,
    name,
    email,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0f172a`,
    roleTitle: roleTitle || 'Software Engineer',
    color,
    bio: 'Product collaborator on Kortex.',
    createdAt: new Date().toISOString(),
    passwordHash,
  };

  db.users.push(newUser);

  // Add user as member to the primary workspace
  if (db.workspaces.length > 0) {
    const defaultWorkspace = db.workspaces[0];
    db.workspaceMembers.push({
      workspaceId: defaultWorkspace.id,
      userId: newUser.id,
      role: 'member',
      joinedAt: new Date().toISOString(),
      user: newUser,
    });
  }

  saveDb(db);
  const { passwordHash: _, ...user } = newUser;
  return res.status(201).json({ user, token: user.id });
});

router.get('/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({ user });
});

router.get('/auth/demo-users', (_req: Request, res: Response) => {
  const db = getDb();
  const safeUsers = db.users.map(({ passwordHash, ...user }) => user);
  return res.json({ users: safeUsers });
});

router.post('/auth/switch-demo', (req: Request, res: Response) => {
  const { userId } = req.body;
  const db = getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { passwordHash, ...safeUser } = user;
  return res.json({ user: safeUser, token: safeUser.id });
});

router.put('/auth/profile', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { name, roleTitle, bio, avatarUrl } = req.body;
  const db = getDb();
  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found' });

  if (name) dbUser.name = name;
  if (roleTitle) dbUser.roleTitle = roleTitle;
  if (bio !== undefined) dbUser.bio = bio;
  if (avatarUrl) dbUser.avatarUrl = avatarUrl;

  // Also update in workspaceMembers
  db.workspaceMembers.forEach((wm) => {
    if (wm.userId === user.id) {
      wm.user = { ...dbUser };
    }
  });

  saveDb(db);
  const { passwordHash, ...safeUser } = dbUser;
  return res.json({ user: safeUser });
});

router.post('/auth/reset-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  // Simulates sending reset email with success acknowledgement
  return res.json({ message: `Password reset instructions dispatched to ${email}` });
});

// ==========================================
// WORKSPACE ROUTES
// ==========================================

router.get('/workspaces', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const db = getDb();

  // Return workspaces user is member of
  const memberWorkspaces = db.workspaceMembers
    .filter((wm) => wm.userId === (user?.id || 'usr_elena'))
    .map((wm) => {
      const ws = db.workspaces.find((w) => w.id === wm.workspaceId);
      if (!ws) return null;
      const count = db.workspaceMembers.filter((m) => m.workspaceId === ws.id).length;
      const docsCount = db.documents.filter((d) => d.workspaceId === ws.id).length;
      return {
        ...ws,
        membersCount: count,
        documentsCount: docsCount,
        myRole: wm.role,
      };
    })
    .filter(Boolean);

  return res.json({ workspaces: memberWorkspaces });
});

router.post('/workspaces', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { name, description, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Workspace name is required' });

  const db = getDb();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const newWorkspace: Workspace = {
    id: `ws_${Date.now()}`,
    name,
    slug,
    description: description || '',
    icon: icon || '💼',
    ownerId: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.workspaces.push(newWorkspace);

  // Add owner membership
  db.workspaceMembers.push({
    workspaceId: newWorkspace.id,
    userId: user.id,
    role: 'owner',
    joinedAt: new Date().toISOString(),
    user,
  });

  // Create default welcome document
  const welcomeDoc: DocumentItem = {
    id: `doc_${Date.now()}`,
    workspaceId: newWorkspace.id,
    title: 'Welcome to ' + name,
    content: `<h2>Welcome to ${name}</h2><p>This is your collaborative workspace. Start by adding team members, crafting documents, or organizing tasks on the Kanban board.</p><ul><li>Use the slash command <code>/</code> in the editor for quick formatting.</li><li>Collaborators see your live presence and edits in real time.</li></ul>`,
    icon: '✨',
    isFavorite: true,
    createdBy: user.id,
    createdByUser: user,
    updatedBy: user.id,
    updatedByUser: user,
    version: 1,
    wordCount: 42,
    readingMinutes: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.documents.push(welcomeDoc);

  saveDb(db);
  return res.status(201).json({ workspace: newWorkspace });
});

router.put('/workspaces/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, icon } = req.body;
  const db = getDb();
  const ws = db.workspaces.find((w) => w.id === id);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });

  if (name) ws.name = name;
  if (description !== undefined) ws.description = description;
  if (icon) ws.icon = icon;
  ws.updatedAt = new Date().toISOString();

  saveDb(db);
  return res.json({ workspace: ws });
});

router.delete('/workspaces/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  const db = getDb();
  const ws = db.workspaces.find((w) => w.id === id);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });

  if (ws.ownerId !== user?.id) {
    return res.status(403).json({ error: 'Only the workspace owner can delete it' });
  }

  db.workspaces = db.workspaces.filter((w) => w.id !== id);
  db.workspaceMembers = db.workspaceMembers.filter((m) => m.workspaceId !== id);
  db.documents = db.documents.filter((d) => d.workspaceId !== id);
  db.tasks = db.tasks.filter((t) => t.workspaceId !== id);

  saveDb(db);
  return res.json({ message: 'Workspace deleted successfully' });
});

// Workspace Members & Invites
router.get('/workspaces/:id/members', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const members = db.workspaceMembers
    .filter((m) => m.workspaceId === id)
    .map((m) => {
      const u = db.users.find((user) => user.id === m.userId);
      return {
        ...m,
        user: u ? (({ passwordHash, ...safe }) => safe)(u) : m.user,
      };
    });
  return res.json({ members });
});

router.post('/workspaces/:id/invite', (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, role } = req.body;
  const user = getAuthUser(req);
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const db = getDb();
  const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    // Check if already a member
    const alreadyMember = db.workspaceMembers.some(
      (m) => m.workspaceId === id && m.userId === existingUser.id
    );
    if (alreadyMember) {
      return res.status(400).json({ error: 'User is already a member of this workspace' });
    }

    db.workspaceMembers.push({
      workspaceId: id,
      userId: existingUser.id,
      role: role || 'member',
      joinedAt: new Date().toISOString(),
      user: (({ passwordHash, ...u }) => u)(existingUser),
    });

    // Send notification
    db.notifications.push({
      id: `notif_${Date.now()}`,
      userId: existingUser.id,
      workspaceId: id,
      type: 'invite',
      title: 'Added to Workspace',
      message: `${user?.name || 'A team member'} added you to the workspace as ${role || 'member'}.`,
      link: '/',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  } else {
    // Add to pending invitations
    db.invitations.push({
      id: `inv_${Date.now()}`,
      workspaceId: id,
      email,
      role: role || 'member',
      invitedBy: user?.id || 'unknown',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  saveDb(db);
  return res.json({ message: `Invitation dispatched for ${email}` });
});

router.put('/workspaces/:id/members/:userId', (req: Request, res: Response) => {
  const { id, userId } = req.params;
  const { role } = req.body;
  const db = getDb();
  const member = db.workspaceMembers.find((m) => m.workspaceId === id && m.userId === userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  member.role = role;
  saveDb(db);
  return res.json({ member });
});

router.delete('/workspaces/:id/members/:userId', (req: Request, res: Response) => {
  const { id, userId } = req.params;
  const db = getDb();
  db.workspaceMembers = db.workspaceMembers.filter(
    (m) => !(m.workspaceId === id && m.userId === userId)
  );
  saveDb(db);
  return res.json({ message: 'Member removed from workspace' });
});

// ==========================================
// DOCUMENT ROUTES
// ==========================================

router.get('/workspaces/:id/documents', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const docs = db.documents.filter((d) => d.workspaceId === id);
  return res.json({ documents: docs });
});

router.post('/workspaces/:id/documents', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  const { title, content, icon, folderId } = req.body;

  const db = getDb();
  const newDoc: DocumentItem = {
    id: `doc_${Date.now()}`,
    workspaceId: id,
    title: title || 'Untitled Document',
    content: content || '<h2>Untitled Document</h2><p>Start writing or press "/" for commands...</p>',
    icon: icon || '📄',
    coverUrl: '',
    folderId: folderId || null,
    isFavorite: false,
    createdBy: user?.id || 'usr_elena',
    createdByUser: user || db.users[0],
    updatedBy: user?.id || 'usr_elena',
    updatedByUser: user || db.users[0],
    version: 1,
    wordCount: 8,
    readingMinutes: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.documents.unshift(newDoc);

  // Add initial version
  db.documentVersions.push({
    id: `ver_${Date.now()}`,
    documentId: newDoc.id,
    versionNumber: 1,
    title: newDoc.title,
    content: newDoc.content,
    updatedBy: newDoc.createdBy,
    updatedByUser: newDoc.createdByUser,
    createdAt: newDoc.createdAt,
    summary: 'Document created',
  });

  // Log activity
  db.activities.unshift({
    id: `act_${Date.now()}`,
    workspaceId: id,
    userId: user?.id || 'usr_elena',
    userName: user?.name || 'Elena Rostova',
    userAvatar: user?.avatarUrl || '',
    action: 'created_doc',
    targetTitle: newDoc.title,
    targetId: newDoc.id,
    targetType: 'document',
    timestamp: new Date().toISOString(),
  });

  saveDb(db);
  return res.status(201).json({ document: newDoc });
});

router.get('/documents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Attach populated creator & updater
  doc.createdByUser = db.users.find((u) => u.id === doc.createdBy);
  doc.updatedByUser = db.users.find((u) => u.id === doc.updatedBy);

  return res.json({ document: doc });
});

router.put('/documents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  const { title, content, icon, coverUrl, folderId } = req.body;

  const db = getDb();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const prevContent = doc.content;
  if (title !== undefined) doc.title = title;
  if (content !== undefined) doc.content = content;
  if (icon !== undefined) doc.icon = icon;
  if (coverUrl !== undefined) doc.coverUrl = coverUrl;
  if (folderId !== undefined) doc.folderId = folderId;

  doc.updatedBy = user?.id || doc.updatedBy;
  doc.updatedByUser = user || doc.updatedByUser;
  doc.updatedAt = new Date().toISOString();
  doc.version = (doc.version || 1) + 1;

  // Calculate word count
  const clean = doc.content.replace(/<[^>]*>/g, ' ');
  doc.wordCount = clean.trim().split(/\s+/).filter(Boolean).length;
  doc.readingMinutes = Math.max(1, Math.ceil(doc.wordCount / 200));

  // Save version snapshot if content changed significantly
  if (content && content !== prevContent) {
    db.documentVersions.push({
      id: `ver_${Date.now()}`,
      documentId: doc.id,
      versionNumber: doc.version,
      title: doc.title,
      content: doc.content,
      updatedBy: doc.updatedBy,
      updatedByUser: doc.updatedByUser,
      createdAt: doc.updatedAt,
      summary: `Revision saved by ${user?.name || 'Collaborator'}`,
    });
  }

  saveDb(db);
  return res.json({ document: doc });
});

router.post('/documents/:id/duplicate', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  const db = getDb();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const duplicated: DocumentItem = {
    ...doc,
    id: `doc_${Date.now()}`,
    title: `${doc.title} (Copy)`,
    createdBy: user?.id || doc.createdBy,
    createdByUser: user || doc.createdByUser,
    updatedBy: user?.id || doc.updatedBy,
    updatedByUser: user || doc.updatedByUser,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.documents.unshift(duplicated);
  saveDb(db);
  return res.status(201).json({ document: duplicated });
});

router.post('/documents/:id/favorite', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  doc.isFavorite = !doc.isFavorite;
  saveDb(db);
  return res.json({ isFavorite: doc.isFavorite });
});

router.delete('/documents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  db.documents = db.documents.filter((d) => d.id !== id);
  db.documentVersions = db.documentVersions.filter((v) => v.documentId !== id);
  db.comments = db.comments.filter((c) => c.documentId !== id);
  saveDb(db);
  return res.json({ message: 'Document deleted' });
});

router.get('/documents/:id/versions', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const versions = db.documentVersions
    .filter((v) => v.documentId === id)
    .sort((a, b) => b.versionNumber - a.versionNumber);
  return res.json({ versions });
});

router.post('/documents/:id/restore-version', (req: Request, res: Response) => {
  const { id } = req.params;
  const { versionId } = req.body;
  const user = getAuthUser(req);
  const db = getDb();

  const doc = db.documents.find((d) => d.id === id);
  const version = db.documentVersions.find((v) => v.id === versionId);
  if (!doc || !version) return res.status(404).json({ error: 'Version not found' });

  doc.title = version.title;
  doc.content = version.content;
  doc.updatedBy = user?.id || doc.updatedBy;
  doc.updatedByUser = user || doc.updatedByUser;
  doc.updatedAt = new Date().toISOString();
  doc.version = (doc.version || 1) + 1;

  db.documentVersions.push({
    id: `ver_${Date.now()}`,
    documentId: doc.id,
    versionNumber: doc.version,
    title: doc.title,
    content: doc.content,
    updatedBy: doc.updatedBy,
    updatedByUser: doc.updatedByUser,
    createdAt: doc.updatedAt,
    summary: `Restored from version ${version.versionNumber}`,
  });

  saveDb(db);
  return res.json({ document: doc });
});

// ==========================================
// COMMENTS & DISCUSSIONS
// ==========================================

router.get('/documents/:id/comments', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const comments = db.comments.filter((c) => c.documentId === id && !c.parentCommentId);

  // Attach replies
  const commentsWithReplies = comments.map((parent) => {
    const replies = db.comments.filter((c) => c.parentCommentId === parent.id);
    return { ...parent, replies };
  });

  return res.json({ comments: commentsWithReplies });
});

router.post('/documents/:id/comments', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  const { content, parentCommentId, selectedText } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content is required' });

  const db = getDb();
  const newComment: DocumentComment = {
    id: `cmt_${Date.now()}`,
    documentId: id,
    parentCommentId: parentCommentId || null,
    userId: user?.id || 'usr_elena',
    user: user || db.users[0],
    content,
    isResolved: false,
    selectedText: selectedText || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
  };

  db.comments.push(newComment);

  // If this is a reply, attach to parent in response
  saveDb(db);
  return res.status(201).json({ comment: newComment });
});

router.put('/comments/:id/resolve', (req: Request, res: Response) => {
  const { id } = req.params;
  const { isResolved } = req.body;
  const db = getDb();
  const comment = db.comments.find((c) => c.id === id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  comment.isResolved = isResolved !== undefined ? isResolved : !comment.isResolved;
  comment.updatedAt = new Date().toISOString();
  saveDb(db);
  return res.json({ comment });
});

router.delete('/comments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  db.comments = db.comments.filter((c) => c.id !== id && c.parentCommentId !== id);
  saveDb(db);
  return res.json({ message: 'Comment removed' });
});

// ==========================================
// TASKS & KANBAN MANAGEMENT
// ==========================================

router.get('/workspaces/:id/tasks', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const tasks = db.tasks
    .filter((t) => t.workspaceId === id)
    .map((task) => ({
      ...task,
      assignee: db.users.find((u) => u.id === task.assigneeId) || null,
      creator: db.users.find((u) => u.id === task.creatorId) || null,
    }));
  return res.json({ tasks });
});

router.post('/workspaces/:id/tasks', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  const { title, description, status, priority, assigneeId, dueDate, tags, documentId } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required' });

  const db = getDb();
  const doc = documentId ? db.documents.find((d) => d.id === documentId) : null;
  const assignee = assigneeId ? db.users.find((u) => u.id === assigneeId) : null;

  const newTask: TaskItem = {
    id: `tsk_${Date.now()}`,
    workspaceId: id,
    title,
    description: description || '',
    status: status || 'todo',
    priority: priority || 'medium',
    assigneeId: assigneeId || null,
    assignee,
    creatorId: user?.id || 'usr_elena',
    creator: user || db.users[0],
    dueDate: dueDate || null,
    tags: Array.isArray(tags) ? tags : [],
    documentId: documentId || null,
    documentTitle: doc ? doc.title : null,
    order: db.tasks.length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.tasks.push(newTask);

  // If assigned to someone else, notify them
  if (assigneeId && assigneeId !== user?.id) {
    db.notifications.push({
      id: `notif_${Date.now()}`,
      userId: assigneeId,
      workspaceId: id,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `${user?.name || 'A team member'} assigned you to "${newTask.title}".`,
      link: '/tasks',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  // Log activity
  db.activities.unshift({
    id: `act_${Date.now()}`,
    workspaceId: id,
    userId: user?.id || 'usr_elena',
    userName: user?.name || 'Elena Rostova',
    userAvatar: user?.avatarUrl || '',
    action: 'created_task',
    targetTitle: newTask.title,
    targetId: newTask.id,
    targetType: 'task',
    timestamp: new Date().toISOString(),
  });

  saveDb(db);
  return res.status(201).json({ task: newTask });
});

router.put('/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  const db = getDb();
  const task = db.tasks.find((t) => t.id === id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, assigneeId, dueDate, tags } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined) {
    const wasDone = task.status === 'done';
    task.status = status;
    if (status === 'done' && !wasDone) {
      db.activities.unshift({
        id: `act_${Date.now()}`,
        workspaceId: task.workspaceId,
        userId: user?.id || 'usr_elena',
        userName: user?.name || 'Elena Rostova',
        userAvatar: user?.avatarUrl || '',
        action: 'completed_task',
        targetTitle: task.title,
        targetId: task.id,
        targetType: 'task',
        timestamp: new Date().toISOString(),
      });
    }
  }
  if (priority !== undefined) task.priority = priority;
  if (assigneeId !== undefined) {
    task.assigneeId = assigneeId;
    task.assignee = db.users.find((u) => u.id === assigneeId) || null;
  }
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (tags !== undefined) task.tags = tags;
  task.updatedAt = new Date().toISOString();

  saveDb(db);
  return res.json({ task });
});

router.delete('/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  db.tasks = db.tasks.filter((t) => t.id !== id);
  saveDb(db);
  return res.json({ message: 'Task deleted' });
});

// ==========================================
// FOLDERS
// ==========================================

router.get('/workspaces/:id/folders', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const folders = db.folders.filter((f) => f.workspaceId === id);
  return res.json({ folders });
});

router.post('/workspaces/:id/folders', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, icon, parentFolderId } = req.body;
  if (!name) return res.status(400).json({ error: 'Folder name is required' });

  const db = getDb();
  const newFolder: DocumentFolder = {
    id: `fld_${Date.now()}`,
    workspaceId: id,
    name,
    icon: icon || '📁',
    parentFolderId: parentFolderId || null,
    createdAt: new Date().toISOString(),
  };

  db.folders.push(newFolder);
  saveDb(db);
  return res.status(201).json({ folder: newFolder });
});

// ==========================================
// NOTIFICATIONS
// ==========================================

router.get('/workspaces/:id/notifications', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  const db = getDb();

  const userNotifs = db.notifications
    .filter((n) => n.userId === (user?.id || 'usr_elena') && n.workspaceId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ notifications: userNotifs });
});

router.put('/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const notif = db.notifications.find((n) => n.id === id);
  if (notif) {
    notif.isRead = true;
    saveDb(db);
  }
  return res.json({ success: true });
});

router.put('/workspaces/:id/notifications/read-all', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  const db = getDb();

  db.notifications.forEach((n) => {
    if (n.userId === (user?.id || 'usr_elena') && n.workspaceId === id) {
      n.isRead = true;
    }
  });

  saveDb(db);
  return res.json({ success: true });
});

// ==========================================
// GLOBAL SEARCH
// ==========================================

router.get('/workspaces/:id/search', (req: Request, res: Response) => {
  const { id } = req.params;
  const query = (req.query.q as string) || '';
  const db = getDb();
  const q = query.toLowerCase().trim();

  if (!q) {
    return res.json({ documents: [], tasks: [], members: [] });
  }

  const matchedDocs = db.documents
    .filter((d) => d.workspaceId === id)
    .filter((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
    .slice(0, 10);

  const matchedTasks = db.tasks
    .filter((t) => t.workspaceId === id)
    .filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    )
    .slice(0, 10);

  const matchedMembers = db.workspaceMembers
    .filter((m) => m.workspaceId === id)
    .filter(
      (m) =>
        m.user.name.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q) ||
        m.user.roleTitle.toLowerCase().includes(q)
    )
    .map((m) => m.user)
    .slice(0, 5);

  return res.json({
    documents: matchedDocs,
    tasks: matchedTasks,
    members: matchedMembers,
  });
});

// ==========================================
// RECENT ACTIVITIES
// ==========================================

router.get('/workspaces/:id/activity', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const activities = db.activities
    .filter((a) => a.workspaceId === id)
    .slice(0, 20);
  return res.json({ activities });
});

export default router;
