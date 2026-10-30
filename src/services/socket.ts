import { CollaboratorPresence, User } from '../types/index.ts';

type Listener = (payload: any) => void;

class RealtimeSocketManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private reconnectTimer: any = null;
  private currentDocId: string | null = null;
  private currentUser: User | null = null;
  private isExplicitlyClosed = false;
  private connectedStatusListeners: Set<(connected: boolean) => void> = new Set();
  public isConnected = false;

  public connect(user: User | null) {
    this.currentUser = user;
    this.isExplicitlyClosed = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyConnectionChange(true);
        // If we were previously viewing a document, rejoin room
        if (this.currentDocId && this.currentUser) {
          this.joinDocument(this.currentDocId, this.currentUser);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type) {
            this.emit(msg.type, msg);
          }
        } catch (err) {
          console.error('Error handling WS message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyConnectionChange(false);
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Realtime WebSocket error:', err);
        this.isConnected = false;
        this.notifyConnectionChange(false);
      };
    } catch (e) {
      console.warn('WebSocket init exception:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isExplicitlyClosed) {
        this.connect(this.currentUser);
      }
    }, 2000);
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.notifyConnectionChange(false);
  }

  public onConnectionChange(listener: (connected: boolean) => void) {
    this.connectedStatusListeners.add(listener);
    listener(this.isConnected);
    return () => {
      this.connectedStatusListeners.delete(listener);
    };
  }

  private notifyConnectionChange(connected: boolean) {
    this.connectedStatusListeners.forEach((l) => l(connected));
  }

  public subscribe(eventType: string, listener: Listener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(listener);
      }
    };
  }

  private emit(eventType: string, payload: any) {
    const set = this.listeners.get(eventType);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error(`Error in listener for ${eventType}:`, err);
        }
      });
    }
  }

  private send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  public joinDocument(documentId: string, user: User) {
    this.currentDocId = documentId;
    this.currentUser = user;
    this.send('doc:join', { documentId, user });
  }

  public leaveDocument(documentId: string) {
    if (this.currentDocId === documentId) {
      this.currentDocId = null;
    }
    this.send('doc:leave', { documentId });
  }

  public sendDocChange(documentId: string, title?: string, content?: string, version?: number, userId?: string) {
    this.send('doc:change', { documentId, title, content, version, userId });
  }

  public sendCursor(documentId: string, cursor?: any, isTyping?: boolean) {
    this.send('doc:cursor', { documentId, cursor, isTyping });
  }

  public sendTaskUpdate(workspaceId: string, task: any) {
    this.send('task:update', { workspaceId, task });
  }

  public sendNewComment(documentId: string, comment: any) {
    this.send('comment:new', { documentId, comment });
  }

  public sendResolveComment(documentId: string, commentId: string, isResolved: boolean) {
    this.send('comment:resolve', { documentId, commentId, isResolved });
  }
}

export const realtime = new RealtimeSocketManager();
