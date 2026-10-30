import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Workspace,
  WorkspaceMember,
  Invitation,
  DocumentItem,
  DocumentVersion,
  DocumentFolder,
  TaskItem,
  DocumentComment,
  NotificationItem,
  ActivityEvent,
} from '../src/types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'kortex-db.json');

export interface DatabaseSchema {
  users: Array<User & { passwordHash: string }>;
  workspaces: Workspace[];
  workspaceMembers: WorkspaceMember[];
  invitations: Invitation[];
  folders: DocumentFolder[];
  documents: DocumentItem[];
  documentVersions: DocumentVersion[];
  tasks: TaskItem[];
  comments: DocumentComment[];
  notifications: NotificationItem[];
  activities: ActivityEvent[];
}

let dbInstance: DatabaseSchema | null = null;

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) return;
  fs.mkdirSync(dirname, { recursive: true });
}

function getInitialSeed(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const defaultHash = bcrypt.hashSync('password123', salt);

  const elena: User & { passwordHash: string } = {
    id: 'usr_elena',
    name: 'Elena Rostova',
    email: 'elena@kortex.io',
    avatarUrl: '/src/assets/images/avatar_elena_rostova_1793343814525.jpg',
    roleTitle: 'Lead Systems Architect',
    color: '#3b82f6',
    bio: 'Distributed systems architect & technical lead. Obsessed with low latency, clean schemas, and resilient engineering.',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    passwordHash: defaultHash,
  };

  const marcus: User & { passwordHash: string } = {
    id: 'usr_marcus',
    name: 'Marcus Vance',
    email: 'marcus@kortex.io',
    avatarUrl: '/src/assets/images/avatar_marcus_vance_1793343814546.jpg',
    roleTitle: 'Principal Systems Engineer',
    color: '#10b981',
    bio: 'Backend & concurrency specialist. Scaling real-time synchronization pipelines and caching layers.',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    passwordHash: defaultHash,
  };

  const sarah: User & { passwordHash: string } = {
    id: 'usr_sarah',
    name: 'Sarah Jenkins',
    email: 'sarah@kortex.io',
    avatarUrl: '/src/assets/images/avatar_sarah_jenkins_1793343814869.jpg',
    roleTitle: 'Design Director',
    color: '#ec4899',
    bio: 'Crafting unified design systems, micro-interactions, and high-velocity workflow interfaces.',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    passwordHash: defaultHash,
  };

  const david: User & { passwordHash: string } = {
    id: 'usr_david',
    name: 'David Chen',
    email: 'david@kortex.io',
    avatarUrl: '/src/assets/images/avatar_david_chen_1793343815567.jpg',
    roleTitle: 'Head of Product Strategy',
    color: '#8b5cf6',
    bio: 'Product strategist aligning roadmap execution, developer velocity, and business outcomes.',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    passwordHash: defaultHash,
  };

  const workspace1: Workspace = {
    id: 'ws_engineering',
    name: 'Acme Product Engineering',
    slug: 'acme-eng',
    description: 'Core product architecture, distributed infrastructure, and product roadmap planning.',
    icon: '⚡',
    ownerId: elena.id,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const workspace2: Workspace = {
    id: 'ws_design',
    name: 'Apollo Design Systems',
    slug: 'apollo-design',
    description: 'Component libraries, design tokens, brand specs, and user experience research.',
    icon: '🎨',
    ownerId: sarah.id,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const workspaceMembers: WorkspaceMember[] = [
    { workspaceId: workspace1.id, userId: elena.id, role: 'owner', joinedAt: workspace1.createdAt, user: elena },
    { workspaceId: workspace1.id, userId: marcus.id, role: 'admin', joinedAt: workspace1.createdAt, user: marcus },
    { workspaceId: workspace1.id, userId: sarah.id, role: 'member', joinedAt: workspace1.createdAt, user: sarah },
    { workspaceId: workspace1.id, userId: david.id, role: 'member', joinedAt: workspace1.createdAt, user: david },
    // workspace 2
    { workspaceId: workspace2.id, userId: sarah.id, role: 'owner', joinedAt: workspace2.createdAt, user: sarah },
    { workspaceId: workspace2.id, userId: elena.id, role: 'admin', joinedAt: workspace2.createdAt, user: elena },
    { workspaceId: workspace2.id, userId: david.id, role: 'member', joinedAt: workspace2.createdAt, user: david },
  ];

  const folders: DocumentFolder[] = [
    { id: 'fld_architecture', workspaceId: workspace1.id, name: 'Architecture & RFCs', icon: '🏛️', createdAt: new Date().toISOString() },
    { id: 'fld_roadmap', workspaceId: workspace1.id, name: 'Roadmap & Specs', icon: '🗺️', createdAt: new Date().toISOString() },
    { id: 'fld_sprints', workspaceId: workspace1.id, name: 'Sprint Notes', icon: '📋', createdAt: new Date().toISOString() },
  ];

  const doc1Content = `
<h2>Executive Summary</h2>
<p>The primary objective for Q4 is establishing our unified high-concurrency state synchronization pipeline. This architecture transition reduces client roundtrip latency to sub-20ms while introducing collaborative conflict-free editing semantics across all workspace assets.</p>

<h2>Architecture Principles</h2>
<ul>
  <li><strong>Server-Authoritative Synchronization:</strong> The WebSocket server arbitrates state mutations, assigns deterministic version sequences, and broadcasts minimal deltas.</li>
  <li><strong>Idempotent Event Ingestion:</strong> Every mutation payload carries an immutable client event key to eliminate duplication on reconnect.</li>
  <li><strong>Zero Ghost Watermarks:</strong> Adherence to clean typography, single-elevation card depth, and strict visual hierarchy.</li>
</ul>

<h2>Infrastructure Deployment Matrix</h2>
<table>
  <thead>
    <tr>
      <th>Layer</th>
      <th>Technology</th>
      <th>SLA Target</th>
      <th>Current Health</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Edge Gateway</td>
      <td>HTTP/2 & WebSocket Reverse Proxy</td>
      <td>99.99%</td>
      <td>Nominal</td>
    </tr>
    <tr>
      <td>State Store</td>
      <td>Transactional Memory & Disk Journaling</td>
      <td>99.95%</td>
      <td>Optimal</td>
    </tr>
    <tr>
      <td>Presence Engine</td>
      <td>In-Memory Heartbeat Mesh</td>
      <td>99.9%</td>
      <td>Active</td>
    </tr>
  </tbody>
</table>

<h2>Implementation Checklist</h2>
<ul class="task-list">
  <li>[x] Formulate initial data schema and role-based permissions matrix</li>
  <li>[x] Implement real-time WebSocket protocol with room isolation</li>
  <li>[ ] Benchmark concurrent editor stress testing with 50+ simultaneous peers</li>
  <li>[ ] Finalize zero-latency search index indexing across workspace documents</li>
</ul>

<blockquote>"Simplicity is prerequisite for reliability." — Edsger W. Dijkstra</blockquote>
<pre><code>// Example client delta broadcast
socket.send(JSON.stringify({
  type: 'doc-change',
  documentId: 'doc_rfc_roadmap',
  delta: { title, content, version: currentVersion + 1 },
  timestamp: Date.now()
}));</code></pre>
`;

  const doc2Content = `
<h2>Design Token Architecture</h2>
<p>This document codifies the design tokens, spatial spacing mathematics, and component state contracts across Kortex Workspace.</p>

<h2>Spatial Math & Padding</h2>
<p>Consistent spatial discipline creates harmony and balance across desktop and tablet viewports:</p>
<ul>
  <li><strong>Outer Container Padding:</strong> <code>24px</code> (desktop) and <code>16px</code> (mobile)</li>
  <li><strong>Button Sizing:</strong> Horizontal padding is approximately 2x vertical padding (<code>py-2 px-4</code>)</li>
  <li><strong>Nested Radius Formula:</strong> <code>r_inner = r_outer - padding</code> to guarantee visual concentricity.</li>
</ul>

<h2>Color Balance Formula (60-30-10)</h2>
<p>Allocate colors with strict intentional restraint:</p>
<ul>
  <li><strong>60% Neutral Canvas:</strong> Deep slate (#0c0e14) with subtle hairline dividers (#1e293b).</li>
  <li><strong>30% Structural Surfaces:</strong> Flat cards with single-elevation borders (#161b26).</li>
  <li><strong>10% Accent Budget:</strong> Concentrated exclusively on actionable triggers (Indigo/Emerald #6366f1).</li>
</ul>
`;

  const doc3Content = `
<h2>Sprint 42 Retrospective</h2>
<p>Sprint 42 focused on completing the rich text editor slash command menu, task board Kanban transitions, and multi-user presence indicators.</p>

<h2>What Went Well</h2>
<ul>
  <li>WebSocket reconnection handled cleanly without data loss.</li>
  <li>Keyboard shortcuts (Cmd+K, formatting hotkeys) tested flawlessly.</li>
  <li>Kanban task columns provide instant drag/click status updates.</li>
</ul>

<h2>Action Items for Sprint 43</h2>
<ul>
  <li>Integrate granular member role assignments (Owner, Admin, Member, Viewer).</li>
  <li>Add document duplicate and export functionality.</li>
</ul>
`;

  const doc1: DocumentItem = {
    id: 'doc_rfc_roadmap',
    workspaceId: workspace1.id,
    title: 'Q4 Strategic Architecture & Sync Engine RFC',
    content: doc1Content.trim(),
    icon: '🚀',
    coverUrl: '',
    folderId: 'fld_architecture',
    isFavorite: true,
    createdBy: elena.id,
    createdByUser: elena,
    updatedBy: marcus.id,
    updatedByUser: marcus,
    version: 3,
    wordCount: 220,
    readingMinutes: 2,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  };

  const doc2: DocumentItem = {
    id: 'doc_design_tokens',
    workspaceId: workspace1.id,
    title: 'Design System & Component Token Specifications',
    content: doc2Content.trim(),
    icon: '🎨',
    coverUrl: '',
    folderId: 'fld_roadmap',
    isFavorite: true,
    createdBy: sarah.id,
    createdByUser: sarah,
    updatedBy: sarah.id,
    updatedByUser: sarah,
    version: 2,
    wordCount: 160,
    readingMinutes: 1,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  };

  const doc3: DocumentItem = {
    id: 'doc_sprint_retro',
    workspaceId: workspace1.id,
    title: 'Sprint 42 Retrospective & Velocity Review',
    content: doc3Content.trim(),
    icon: '📋',
    coverUrl: '',
    folderId: 'fld_sprints',
    isFavorite: false,
    createdBy: david.id,
    createdByUser: david,
    updatedBy: david.id,
    updatedByUser: david,
    version: 1,
    wordCount: 120,
    readingMinutes: 1,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 18000000).toISOString(),
  };

  const documentVersions: DocumentVersion[] = [
    {
      id: 'ver_doc1_1',
      documentId: doc1.id,
      versionNumber: 1,
      title: 'Q4 Strategic Architecture RFC (Initial Draft)',
      content: '<h2>Initial Outline</h2><p>Drafting Q4 sync engine architecture.</p>',
      updatedBy: elena.id,
      updatedByUser: elena,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      summary: 'Initial architecture RFC draft created',
    },
    {
      id: 'ver_doc1_2',
      documentId: doc1.id,
      versionNumber: 2,
      title: 'Q4 Strategic Architecture & Sync Engine RFC',
      content: doc1Content.slice(0, 400) + '...',
      updatedBy: marcus.id,
      updatedByUser: marcus,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      summary: 'Added infrastructure deployment matrix and SLA specifications',
    },
    {
      id: 'ver_doc1_3',
      documentId: doc1.id,
      versionNumber: 3,
      title: 'Q4 Strategic Architecture & Sync Engine RFC',
      content: doc1Content.trim(),
      updatedBy: marcus.id,
      updatedByUser: marcus,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      summary: 'Refined WebSocket delta broadcast code example',
    },
  ];

  const tasks: TaskItem[] = [
    {
      id: 'tsk_1',
      workspaceId: workspace1.id,
      title: 'Implement WebSocket real-time presence heartbeat',
      description: 'Emit join/leave events and track active collaborator coordinates with 30s timeout sweep.',
      status: 'done',
      priority: 'high',
      assigneeId: marcus.id,
      assignee: marcus,
      creatorId: elena.id,
      creator: elena,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      tags: ['Realtime', 'Backend', 'WebSocket'],
      documentId: doc1.id,
      documentTitle: doc1.title,
      order: 1,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tsk_2',
      workspaceId: workspace1.id,
      title: 'Design zero-pill metadata badge system & typographic scale',
      description: 'Remove heavy chip capsules and implement unboxed typographic separators with Plus Jakarta Sans.',
      status: 'done',
      priority: 'medium',
      assigneeId: sarah.id,
      assignee: sarah,
      creatorId: sarah.id,
      creator: sarah,
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      tags: ['Design System', 'UI/UX', 'Typography'],
      documentId: doc2.id,
      documentTitle: doc2.title,
      order: 2,
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tsk_3',
      workspaceId: workspace1.id,
      title: 'Construct high-density Kanban board with multi-column filtering',
      description: 'Build responsive columns for Todo, In Progress, In Review, and Done with assignee filters and fast status toggles.',
      status: 'in_progress',
      priority: 'urgent',
      assigneeId: elena.id,
      assignee: elena,
      creatorId: david.id,
      creator: david,
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      tags: ['Frontend', 'Kanban', 'Linear-Style'],
      documentId: doc3.id,
      documentTitle: doc3.title,
      order: 3,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tsk_4',
      workspaceId: workspace1.id,
      title: 'Implement slash command menu for rich text editor',
      description: 'Detect "/" trigger in editor and render quick insert palette for Headings, Checklists, Code Blocks, and Tables.',
      status: 'in_review',
      priority: 'high',
      assigneeId: elena.id,
      assignee: elena,
      creatorId: elena.id,
      creator: elena,
      dueDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      tags: ['Editor', 'Frontend', 'Notion-Style'],
      documentId: doc1.id,
      documentTitle: doc1.title,
      order: 4,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tsk_5',
      workspaceId: workspace1.id,
      title: 'Benchmark optimistic UI updates with conflict resolution test suite',
      description: 'Stress-test simultaneous client updates and verify Last-Write-Wins and version sequencing.',
      status: 'todo',
      priority: 'medium',
      assigneeId: marcus.id,
      assignee: marcus,
      creatorId: elena.id,
      creator: elena,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      tags: ['QA', 'Performance', 'Concurrency'],
      documentId: doc1.id,
      documentTitle: doc1.title,
      order: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const comments: DocumentComment[] = [
    {
      id: 'cmt_1',
      documentId: doc1.id,
      parentCommentId: null,
      userId: marcus.id,
      user: marcus,
      content: 'The 20ms roundtrip target is achievable if we keep the WebSocket payloads strictly under 4KB.',
      isResolved: false,
      selectedText: 'reduces client roundtrip latency to sub-20ms',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      replies: [
        {
          id: 'cmt_1_reply_1',
          documentId: doc1.id,
          parentCommentId: 'cmt_1',
          userId: elena.id,
          user: elena,
          content: 'Agreed! We strip full document metadata from the delta stream and transmit diffs only.',
          isResolved: false,
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        },
      ],
    },
    {
      id: 'cmt_2',
      documentId: doc1.id,
      parentCommentId: null,
      userId: sarah.id,
      user: sarah,
      content: 'Make sure we show a clear collaborator presence avatar cluster at the top of the document.',
      isResolved: true,
      selectedText: 'collaborative conflict-free editing semantics',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      replies: [],
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif_1',
      userId: elena.id,
      workspaceId: workspace1.id,
      type: 'comment',
      title: 'Marcus Vance commented on RFC',
      message: 'The 20ms roundtrip target is achievable if we keep the WebSocket payloads strictly under 4KB.',
      link: `/document/${doc1.id}`,
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'notif_2',
      userId: elena.id,
      workspaceId: workspace1.id,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: 'David Chen assigned you "Construct high-density Kanban board".',
      link: '/tasks',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
    {
      id: 'notif_3',
      userId: elena.id,
      workspaceId: workspace1.id,
      type: 'doc_update',
      title: 'Document Saved',
      message: 'Sarah Jenkins updated Design System & Component Token Specifications.',
      link: `/document/${doc2.id}`,
      isRead: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const activities: ActivityEvent[] = [
    {
      id: 'act_1',
      workspaceId: workspace1.id,
      userId: marcus.id,
      userName: marcus.name,
      userAvatar: marcus.avatarUrl,
      action: 'completed_task',
      targetTitle: 'Implement WebSocket real-time presence heartbeat',
      targetId: 'tsk_1',
      targetType: 'task',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'act_2',
      workspaceId: workspace1.id,
      userId: elena.id,
      userName: elena.name,
      userAvatar: elena.avatarUrl,
      action: 'edited_doc',
      targetTitle: 'Q4 Strategic Architecture & Sync Engine RFC',
      targetId: doc1.id,
      targetType: 'document',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'act_3',
      workspaceId: workspace1.id,
      userId: sarah.id,
      userName: sarah.name,
      userAvatar: sarah.avatarUrl,
      action: 'created_doc',
      targetTitle: 'Design System & Component Token Specifications',
      targetId: doc2.id,
      targetType: 'document',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];

  return {
    users: [elena, marcus, sarah, david],
    workspaces: [workspace1, workspace2],
    workspaceMembers,
    invitations: [],
    folders,
    documents: [doc1, doc2, doc3],
    documentVersions,
    tasks,
    comments,
    notifications,
    activities,
  };
}

export function getDb(): DatabaseSchema {
  if (dbInstance) return dbInstance;
  try {
    ensureDirectoryExistence(DB_FILE);
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      dbInstance = JSON.parse(data);
      if (dbInstance && dbInstance.workspaces && dbInstance.documents) {
        return dbInstance;
      }
    }
  } catch (err) {
    console.error('Error reading DB file, seeding fresh:', err);
  }

  dbInstance = getInitialSeed();
  saveDb(dbInstance);
  return dbInstance;
}

export function saveDb(db: DatabaseSchema): void {
  try {
    ensureDirectoryExistence(DB_FILE);
    const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}
