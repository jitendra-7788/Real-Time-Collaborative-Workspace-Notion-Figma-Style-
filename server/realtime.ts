import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { getDb, saveDb } from './db.ts';
import { CollaboratorPresence, User } from '../src/types/index.ts';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  userColor?: string;
  roleTitle?: string;
  currentDocId?: string;
}

// Map from documentId -> Map of userId -> CollaboratorPresence
const documentPresences = new Map<string, Map<string, CollaboratorPresence>>();

// Broadcast message to all connected clients in a document room
function broadcastToDoc(docId: string, payload: any, senderWs?: WebSocket) {
  const messageStr = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    const extClient = client as ExtendedWebSocket;
    if (
      extClient !== senderWs &&
      extClient.readyState === WebSocket.OPEN &&
      extClient.currentDocId === docId
    ) {
      extClient.send(messageStr);
    }
  });
}

// Broadcast message to all clients in a workspace
function broadcastToWorkspace(workspaceId: string, payload: any, senderWs?: WebSocket) {
  const messageStr = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    const extClient = client as ExtendedWebSocket;
    if (extClient !== senderWs && extClient.readyState === WebSocket.OPEN) {
      extClient.send(messageStr);
    }
  });
}

let wss: WebSocketServer;

export function setupRealtimeServer(server: HttpServer) {
  wss = new WebSocketServer({ server, path: '/ws' });

  // Heartbeat interval to prune dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) {
        handleDisconnect(extWs);
        return extWs.terminate();
      }
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());
        handleClientMessage(ws, msg);
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    });

    ws.on('close', () => {
      handleDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.error('WS client error:', err);
      handleDisconnect(ws);
    });
  });

  return wss;
}

function handleDisconnect(ws: ExtendedWebSocket) {
  if (ws.currentDocId && ws.userId) {
    const docPresences = documentPresences.get(ws.currentDocId);
    if (docPresences) {
      docPresences.delete(ws.userId);
      // Notify remaining clients
      broadcastToDoc(ws.currentDocId, {
        type: 'presence:left',
        documentId: ws.currentDocId,
        userId: ws.userId,
        collaborators: Array.from(docPresences.values()),
      });
      if (docPresences.size === 0) {
        documentPresences.delete(ws.currentDocId);
      }
    }
    ws.currentDocId = undefined;
  }
}

function handleClientMessage(ws: ExtendedWebSocket, msg: any) {
  const { type, payload } = msg;

  switch (type) {
    case 'doc:join': {
      const { documentId, user } = payload as { documentId: string; user: User };
      if (!documentId || !user) return;

      // If user was previously in another doc, remove them
      if (ws.currentDocId && ws.currentDocId !== documentId && ws.userId) {
        const oldPresences = documentPresences.get(ws.currentDocId);
        if (oldPresences) {
          oldPresences.delete(ws.userId);
          broadcastToDoc(ws.currentDocId, {
            type: 'presence:left',
            documentId: ws.currentDocId,
            userId: ws.userId,
            collaborators: Array.from(oldPresences.values()),
          });
        }
      }

      ws.currentDocId = documentId;
      ws.userId = user.id;
      ws.userName = user.name;
      ws.userAvatar = user.avatarUrl;
      ws.userColor = user.color || '#3b82f6';
      ws.roleTitle = user.roleTitle;

      if (!documentPresences.has(documentId)) {
        documentPresences.set(documentId, new Map());
      }
      const docPresences = documentPresences.get(documentId)!;

      const presence: CollaboratorPresence = {
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        color: user.color || '#3b82f6',
        roleTitle: user.roleTitle,
        documentId,
        lastActive: Date.now(),
      };
      docPresences.set(user.id, presence);

      // Send existing state back to the joiner
      const db = getDb();
      const doc = db.documents.find((d) => d.id === documentId);

      ws.send(
        JSON.stringify({
          type: 'doc:sync',
          documentId,
          document: doc,
          collaborators: Array.from(docPresences.values()),
        })
      );

      // Broadcast join to other peers in room
      broadcastToDoc(
        documentId,
        {
          type: 'presence:joined',
          documentId,
          presence,
          collaborators: Array.from(docPresences.values()),
        },
        ws
      );
      break;
    }

    case 'doc:leave': {
      handleDisconnect(ws);
      break;
    }

    case 'doc:cursor': {
      const { documentId, cursor, isTyping } = payload;
      if (!documentId || !ws.userId) return;

      const docPresences = documentPresences.get(documentId);
      if (docPresences && docPresences.has(ws.userId)) {
        const p = docPresences.get(ws.userId)!;
        p.cursor = cursor;
        p.isTyping = !!isTyping;
        p.lastActive = Date.now();

        broadcastToDoc(
          documentId,
          {
            type: 'presence:cursor',
            documentId,
            userId: ws.userId,
            cursor,
            isTyping: !!isTyping,
          },
          ws
        );
      }
      break;
    }

    case 'doc:change': {
      const { documentId, title, content, version, userId } = payload;
      if (!documentId) return;

      const db = getDb();
      const doc = db.documents.find((d) => d.id === documentId);
      if (!doc) return;

      // Update document content and increment version
      doc.title = title !== undefined ? title : doc.title;
      doc.content = content !== undefined ? content : doc.content;
      doc.version = (doc.version || 1) + 1;
      doc.updatedBy = userId || ws.userId || doc.updatedBy;
      doc.updatedAt = new Date().toISOString();

      // Recalculate word count
      const cleanText = doc.content.replace(/<[^>]*>/g, ' ');
      doc.wordCount = cleanText.trim().split(/\s+/).filter(Boolean).length;
      doc.readingMinutes = Math.max(1, Math.ceil(doc.wordCount / 200));

      saveDb(db);

      // Acknowledge to sender with confirmed version
      ws.send(
        JSON.stringify({
          type: 'doc:saved',
          documentId,
          version: doc.version,
          updatedAt: doc.updatedAt,
        })
      );

      // Broadcast content delta to all other room collaborators
      broadcastToDoc(
        documentId,
        {
          type: 'doc:updated',
          documentId,
          title: doc.title,
          content: doc.content,
          version: doc.version,
          updatedBy: doc.updatedBy,
          updatedAt: doc.updatedAt,
          userId: ws.userId,
        },
        ws
      );
      break;
    }

    case 'task:update': {
      const { workspaceId, task } = payload;
      if (!workspaceId || !task) return;
      broadcastToWorkspace(
        workspaceId,
        {
          type: 'task:changed',
          workspaceId,
          task,
        },
        ws
      );
      break;
    }

    case 'comment:new': {
      const { documentId, comment } = payload;
      if (!documentId || !comment) return;
      broadcastToDoc(
        documentId,
        {
          type: 'comment:created',
          documentId,
          comment,
        },
        ws
      );
      break;
    }

    case 'comment:resolve': {
      const { documentId, commentId, isResolved } = payload;
      if (!documentId || !commentId) return;
      broadcastToDoc(
        documentId,
        {
          type: 'comment:resolved',
          documentId,
          commentId,
          isResolved,
        },
        ws
      );
      break;
    }

    default:
      break;
  }
}
