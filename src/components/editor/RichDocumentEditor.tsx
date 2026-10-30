import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Table as TableIcon,
  Link as LinkIcon,
  Undo,
  Redo,
  Sparkles,
  MessageSquare,
  History,
  Share2,
  Trash2,
  Copy,
  Star,
  Check,
  X,
  Send,
  MoreVertical,
  Radio,
  FileText,
  CornerDownRight,
  ExternalLink,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { realtime } from '../../services/socket.ts';
import { api } from '../../services/api.ts';
import {
  DocumentItem,
  DocumentVersion,
  DocumentComment,
  CollaboratorPresence,
} from '../../types/index.ts';

export const RichDocumentEditor: React.FC = () => {
  const {
    activeDocId,
    documents,
    toggleFavorite,
    duplicateDocument,
    deleteDocument,
    setActiveView,
  } = useWorkspace();
  const { user } = useAuth();

  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [contentHtml, setContentHtml] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'synced'>('saved');
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [typingCollaborator, setTypingCollaborator] = useState<string | null>(null);

  // Drawers & Modals
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });

  // Comments state
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Versions state
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);

  // Editor DOM ref
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const isLocalUpdateRef = useRef<boolean>(false);

  // Load document data
  useEffect(() => {
    if (!activeDocId) return;

    let isMounted = true;
    async function loadDoc() {
      try {
        const res = await api.getDocument(activeDocId!);
        if (isMounted) {
          setDoc(res.document);
          setTitle(res.document.title);
          setContentHtml(res.document.content);
          if (editorRef.current && editorRef.current.innerHTML !== res.document.content) {
            editorRef.current.innerHTML = res.document.content;
          }
        }
      } catch (err) {
        console.error('Failed to load document:', err);
      }
    }
    loadDoc();

    // Load comments
    api.getComments(activeDocId).then((res) => {
      if (isMounted) setComments(res.comments);
    });

    // Join real-time document room
    if (user) {
      realtime.joinDocument(activeDocId, user);
    }

    return () => {
      isMounted = false;
      if (activeDocId) {
        realtime.leaveDocument(activeDocId);
      }
    };
  }, [activeDocId, user]);

  // Ensure contentEditable DOM is hydrated when document finishes loading
  useEffect(() => {
    if (doc && editorRef.current && editorRef.current.innerHTML !== doc.content) {
      editorRef.current.innerHTML = doc.content;
    }
  }, [doc?.id, doc?.content]);

  // Subscribe to real-time events for this document
  useEffect(() => {
    if (!activeDocId) return;

    // Listen to initial sync & presence
    const unsubSync = realtime.subscribe('doc:sync', (msg) => {
      if (msg.documentId === activeDocId) {
        setCollaborators(msg.collaborators || []);
      }
    });

    const unsubJoined = realtime.subscribe('presence:joined', (msg) => {
      if (msg.documentId === activeDocId) {
        setCollaborators(msg.collaborators || []);
      }
    });

    const unsubLeft = realtime.subscribe('presence:left', (msg) => {
      if (msg.documentId === activeDocId) {
        setCollaborators(msg.collaborators || []);
      }
    });

    const unsubCursor = realtime.subscribe('presence:cursor', (msg) => {
      if (msg.documentId === activeDocId) {
        if (msg.isTyping) {
          const col = collaborators.find((c) => c.userId === msg.userId);
          setTypingCollaborator(col ? col.name : 'A collaborator');
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setTypingCollaborator(null);
          }, 3000);
        }
      }
    });

    // Listen to remote changes made by other collaborators
    const unsubUpdated = realtime.subscribe('doc:updated', (msg) => {
      if (msg.documentId === activeDocId && msg.userId !== user?.id) {
        setSaveStatus('synced');
        setTimeout(() => setSaveStatus('saved'), 1500);

        if (msg.title !== undefined) setTitle(msg.title);
        if (msg.content !== undefined) {
          setContentHtml(msg.content);
          if (editorRef.current && editorRef.current.innerHTML !== msg.content) {
            // Save selection if focused
            editorRef.current.innerHTML = msg.content;
          }
        }
      }
    });

    // Save confirmation
    const unsubSaved = realtime.subscribe('doc:saved', (msg) => {
      if (msg.documentId === activeDocId) {
        setSaveStatus('saved');
      }
    });

    // Real-time comments
    const unsubCommentCreated = realtime.subscribe('comment:created', (msg) => {
      if (msg.documentId === activeDocId) {
        setComments((prev) => [msg.comment, ...prev]);
      }
    });

    const unsubCommentResolved = realtime.subscribe('comment:resolved', (msg) => {
      if (msg.documentId === activeDocId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === msg.commentId ? { ...c, isResolved: msg.isResolved } : c
          )
        );
      }
    });

    return () => {
      unsubSync();
      unsubJoined();
      unsubLeft();
      unsubCursor();
      unsubUpdated();
      unsubSaved();
      unsubCommentCreated();
      unsubCommentResolved();
    };
  }, [activeDocId, user?.id, collaborators]);

  // Handle local content changes with debounced real-time broadcast
  const handleContentInput = useCallback(() => {
    if (!editorRef.current || !activeDocId || !user) return;
    const currentHtml = editorRef.current.innerHTML;
    setContentHtml(currentHtml);
    setSaveStatus('saving');

    // Notify peers that user is typing
    realtime.sendCursor(activeDocId, null, true);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      realtime.sendDocChange(activeDocId, title, currentHtml, doc?.version, user.id);
    }, 400);
  }, [activeDocId, title, doc?.version, user]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setSaveStatus('saving');
    if (!activeDocId || !user) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      realtime.sendDocChange(activeDocId, newTitle, contentHtml, doc?.version, user.id);
    }, 400);
  };

  // Rich text formatting commands via document.execCommand
  const format = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleContentInput();
    }
  };

  // Insert custom blocks (Table, Callout, Checklist, etc.)
  const insertCustomBlock = (type: string) => {
    setIsSlashMenuOpen(false);
    if (!editorRef.current) return;

    let htmlToInsert = '';
    switch (type) {
      case 'h1':
        format('formatBlock', '<h1>');
        return;
      case 'h2':
        format('formatBlock', '<h2>');
        return;
      case 'h3':
        format('formatBlock', '<h3>');
        return;
      case 'bullet':
        format('insertUnorderedList');
        return;
      case 'numbered':
        format('insertOrderedList');
        return;
      case 'quote':
        format('formatBlock', '<blockquote>');
        return;
      case 'code':
        htmlToInsert = '<pre><code>// Type or paste code snippet here\nfunction execute() {\n  return true;\n}</code></pre><p></p>';
        break;
      case 'table':
        htmlToInsert = `
          <table>
            <thead>
              <tr><th>Header 1</th><th>Header 2</th><th>Header 3</th></tr>
            </thead>
            <tbody>
              <tr><td>Cell 1</td><td>Cell 2</td><td>Cell 3</td></tr>
              <tr><td>Cell 4</td><td>Cell 5</td><td>Cell 6</td></tr>
            </tbody>
          </table><p></p>
        `;
        break;
      case 'checklist':
        htmlToInsert = `
          <ul class="task-list">
            <li>[ ] Action item itemized for the team</li>
            <li>[ ] Verification and review completed</li>
          </ul><p></p>
        `;
        break;
      case 'divider':
        htmlToInsert = '<hr /><p></p>';
        break;
      case 'callout':
        htmlToInsert = `
          <div class="callout" style="padding: 12px 16px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; margin: 12px 0;">
            <strong>Note:</strong> Highlighted architectural specification and guidelines.
          </div><p></p>
        `;
        break;
    }

    if (htmlToInsert) {
      document.execCommand('insertHTML', false, htmlToInsert);
      handleContentInput();
    }
  };

  // Handle slash command keyup
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === '/') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSlashMenuPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
        });
        setIsSlashMenuOpen(true);
      }
    } else if (e.key === 'Escape' && isSlashMenuOpen) {
      setIsSlashMenuOpen(false);
    }
  };

  // Comments functions
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activeDocId) return;

    try {
      const res = await api.createComment(activeDocId, newCommentText);
      setComments((prev) => [res.comment, ...prev]);
      realtime.sendNewComment(activeDocId, res.comment);
      setNewCommentText('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const handleReplyComment = async (parentCommentId: string) => {
    if (!replyText.trim() || !activeDocId) return;
    try {
      const res = await api.createComment(activeDocId, replyText, parentCommentId);
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentCommentId) {
            return {
              ...c,
              replies: [...(c.replies || []), res.comment],
            };
          }
          return c;
        })
      );
      setReplyText('');
      setReplyingToId(null);
    } catch (err) {
      console.error('Failed to post reply:', err);
    }
  };

  const handleToggleResolveComment = async (commentId: string, currentResolved: boolean) => {
    try {
      const nextResolved = !currentResolved;
      await api.resolveComment(commentId, nextResolved);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, isResolved: nextResolved } : c))
      );
      if (activeDocId) {
        realtime.sendResolveComment(activeDocId, commentId, nextResolved);
      }
    } catch (err) {
      console.error('Failed to toggle comment resolution:', err);
    }
  };

  // Versions functions
  const handleOpenVersions = async () => {
    if (!activeDocId) return;
    setIsVersionsOpen(true);
    try {
      const res = await api.getDocumentVersions(activeDocId);
      setVersions(res.versions);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  };

  const handleRestoreVersion = async (version: DocumentVersion) => {
    if (!activeDocId) return;
    try {
      const res = await api.restoreDocumentVersion(activeDocId, version.id);
      setTitle(res.document.title);
      setContentHtml(res.document.content);
      if (editorRef.current) {
        editorRef.current.innerHTML = res.document.content;
      }
      setIsVersionsOpen(false);
      realtime.sendDocChange(activeDocId, res.document.title, res.document.content, res.document.version, user?.id);
    } catch (err) {
      console.error('Failed to restore version:', err);
    }
  };

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-neutral-500">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs">Synchronizing document...</p>
        </div>
      </div>
    );
  }

  // Active peer collaborators (excluding myself)
  const peerCollaborators = collaborators.filter((c) => c.userId !== user?.id);

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] bg-neutral-950 overflow-hidden select-text">
      {/* Main Document Body */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Document Top Bar */}
        <div className="px-6 py-2.5 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between gap-4 shrink-0">
          {/* Status & Presence */}
          <div className="flex items-center gap-3">
            <span className="text-xl">{doc.icon || '📄'}</span>

            {/* Save Status */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved</span>
                </>
              )}
              {saveStatus === 'saving' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span className="text-blue-400">Syncing...</span>
                </>
              )}
              {saveStatus === 'synced' && (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-400">Remote update</span>
                </>
              )}
            </div>

            {/* Typing status notification */}
            {typingCollaborator && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 animate-pulse">
                <span>{typingCollaborator} is editing...</span>
              </div>
            )}
          </div>

          {/* Active Peer Collaborators Avatars */}
          <div className="flex items-center gap-3">
            {peerCollaborators.length > 0 && (
              <div className="flex items-center gap-1 bg-neutral-850 px-2.5 py-1 rounded-full border border-neutral-700/60">
                <span className="text-[10px] text-neutral-400 font-medium mr-1 hidden sm:inline">Editing with:</span>
                <div className="flex -space-x-1.5">
                  {peerCollaborators.map((c) => (
                    <img
                      key={c.userId}
                      src={c.avatarUrl}
                      alt={c.name}
                      title={`${c.name} (${c.roleTitle}) - Active right now`}
                      className="w-5 h-5 rounded-full object-cover ring-2 ring-neutral-900"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Document Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleFavorite(doc.id)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                title={doc.isFavorite ? 'Remove favorite' : 'Add favorite'}
                aria-label="Toggle favorite"
              >
                <Star className={`w-4 h-4 ${doc.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
              </button>

              <button
                onClick={() => duplicateDocument(doc.id)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                title="Duplicate document"
                aria-label="Duplicate document"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleOpenVersions()}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                title="Version history"
                aria-label="Version history"
              >
                <History className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                className={`p-1.5 rounded-lg transition-colors relative ${
                  isCommentsOpen
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
                title="Comments"
                aria-label="Toggle comments"
              >
                <MessageSquare className="w-4 h-4" />
                {comments.filter((c) => !c.isResolved).length > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors cursor-pointer ml-1"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Delete this document permanently?')) {
                    deleteDocument(doc.id);
                  }
                }}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                title="Delete document"
                aria-label="Delete document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="px-6 py-1.5 border-b border-neutral-800/80 bg-neutral-900/40 flex items-center gap-1 overflow-x-auto shrink-0 select-none">
          <button
            onClick={() => format('bold')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Bold (Cmd+B)"
            aria-label="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => format('italic')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Italic (Cmd+I)"
            aria-label="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => format('underline')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Underline (Cmd+U)"
            aria-label="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => format('strikeThrough')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Strikethrough"
            aria-label="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-neutral-800 mx-1"></span>

          <button
            onClick={() => insertCustomBlock('h1')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Heading 1"
            aria-label="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertCustomBlock('h2')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Heading 2"
            aria-label="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertCustomBlock('h3')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Heading 3"
            aria-label="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-neutral-800 mx-1"></span>

          <button
            onClick={() => insertCustomBlock('bullet')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Bullet List"
            aria-label="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertCustomBlock('numbered')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Numbered List"
            aria-label="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertCustomBlock('checklist')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Checklist"
            aria-label="Checklist"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-neutral-800 mx-1"></span>

          <button
            onClick={() => insertCustomBlock('quote')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Blockquote"
            aria-label="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertCustomBlock('code')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Code Block"
            aria-label="Code Block"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertCustomBlock('table')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Insert Table"
            aria-label="Insert Table"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-neutral-800 mx-1"></span>

          <button
            onClick={() => format('undo')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Undo (Cmd+Z)"
            aria-label="Undo"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => format('redo')}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
            title="Redo (Cmd+Y)"
            aria-label="Redo"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>

          <div className="ml-auto text-[11px] text-neutral-500 font-mono hidden md:inline">
            Type <span className="text-blue-400 bg-neutral-800 px-1 py-0.5 rounded">/</span> for slash commands
          </div>
        </div>

        {/* Scrollable Document Canvas */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Document Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Untitled Document"
              className="w-full bg-transparent text-3xl font-extrabold text-neutral-100 placeholder-neutral-600 focus:outline-hidden tracking-tight"
            />

            {/* Document Metadata Bar */}
            <div className="flex items-center gap-3 text-xs text-neutral-500 border-b border-neutral-800/80 pb-4">
              <span>Created by {doc.createdByUser?.name || 'Engineer'}</span>
              <span aria-hidden="true">·</span>
              <span>Version {doc.version}</span>
              <span aria-hidden="true">·</span>
              <span>{doc.wordCount} words</span>
              <span aria-hidden="true">·</span>
              <span>{doc.readingMinutes} min read</span>
            </div>

            {/* ContentEditable Editor Body */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleContentInput}
              onKeyUp={handleKeyDown}
              className="editor-body outline-hidden min-h-[450px] text-neutral-200 text-base leading-relaxed focus:outline-hidden pb-24"
            />
          </div>
        </div>
      </div>

      {/* Floating Slash Commands Menu */}
      {isSlashMenuOpen && (
        <div
          className="fixed z-50 w-60 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1.5 overflow-hidden"
          style={{ top: Math.min(slashMenuPosition.top, window.innerHeight - 300), left: Math.min(slashMenuPosition.left, window.innerWidth - 260) }}
        >
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Insert Block
          </div>
          <button
            onClick={() => insertCustomBlock('h1')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 text-left cursor-pointer"
          >
            <Heading1 className="w-4 h-4 text-blue-400" />
            <div>
              <div className="font-medium">Heading 1</div>
              <div className="text-[10px] text-neutral-500">Large document section title</div>
            </div>
          </button>
          <button
            onClick={() => insertCustomBlock('h2')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 text-left cursor-pointer"
          >
            <Heading2 className="w-4 h-4 text-blue-400" />
            <div>
              <div className="font-medium">Heading 2</div>
              <div className="text-[10px] text-neutral-500">Medium section heading</div>
            </div>
          </button>
          <button
            onClick={() => insertCustomBlock('checklist')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 text-left cursor-pointer"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="font-medium">Task Checklist</div>
              <div className="text-[10px] text-neutral-500">Trackable action items</div>
            </div>
          </button>
          <button
            onClick={() => insertCustomBlock('table')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 text-left cursor-pointer"
          >
            <TableIcon className="w-4 h-4 text-purple-400" />
            <div>
              <div className="font-medium">Table</div>
              <div className="text-[10px] text-neutral-500">Data matrix with 3 columns</div>
            </div>
          </button>
          <button
            onClick={() => insertCustomBlock('code')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 text-left cursor-pointer"
          >
            <Code className="w-4 h-4 text-amber-400" />
            <div>
              <div className="font-medium">Code Block</div>
              <div className="text-[10px] text-neutral-500">Monospace syntax container</div>
            </div>
          </button>
          <button
            onClick={() => insertCustomBlock('callout')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 text-left cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="font-medium">Callout Box</div>
              <div className="text-[10px] text-neutral-500">Important highlight block</div>
            </div>
          </button>
        </div>
      )}

      {/* Right Drawer: Comments & Discussion */}
      {isCommentsOpen && (
        <aside className="w-80 border-l border-neutral-800 bg-neutral-900 flex flex-col h-full shrink-0">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-semibold text-neutral-200">Discussions ({comments.length})</h3>
            </div>
            <button
              onClick={() => setIsCommentsOpen(false)}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Comment Threads List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                No comments yet. Start a discussion below!
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-xl border text-xs space-y-2.5 ${
                    comment.isResolved
                      ? 'bg-neutral-950/40 border-neutral-800/60 opacity-60'
                      : 'bg-neutral-950/80 border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={comment.user.avatarUrl}
                        alt={comment.user.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="font-semibold text-neutral-200">{comment.user.name}</span>
                    </div>
                    <button
                      onClick={() => handleToggleResolveComment(comment.id, comment.isResolved)}
                      className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                        comment.isResolved
                          ? 'bg-neutral-800 text-neutral-400'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {comment.isResolved ? 'Resolved' : 'Resolve'}
                    </button>
                  </div>

                  {comment.selectedText && (
                    <div className="text-[11px] text-neutral-400 pl-2 border-l border-blue-500/50 italic">
                      &ldquo;{comment.selectedText}&rdquo;
                    </div>
                  )}

                  <p className="text-neutral-300 leading-relaxed">{comment.content}</p>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="pl-3 border-l border-neutral-800 space-y-2 pt-1">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <img
                              src={reply.user.avatarUrl}
                              alt={reply.user.name}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                            <span className="font-medium text-neutral-300 text-[11px]">{reply.user.name}</span>
                          </div>
                          <p className="text-[11px] text-neutral-400">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Button & Input */}
                  {replyingToId === comment.id ? (
                    <div className="pt-2 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Reply to thread..."
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1 text-xs text-white focus:outline-hidden"
                      />
                      <button
                        onClick={() => handleReplyComment(comment.id)}
                        className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setReplyingToId(null)}
                        className="p-1 text-neutral-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingToId(comment.id)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                    >
                      <CornerDownRight className="w-3 h-3" />
                      <span>Reply</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* New Comment Input Box */}
          <form onSubmit={handleAddComment} className="p-3 border-t border-neutral-800 bg-neutral-950">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Leave a comment..."
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="p-2 rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-500 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </aside>
      )}

      {/* Right Drawer: Version History */}
      {isVersionsOpen && (
        <aside className="w-80 border-l border-neutral-800 bg-neutral-900 flex flex-col h-full shrink-0">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-neutral-200">Version History</h3>
            </div>
            <button onClick={() => setIsVersionsOpen(false)} className="text-neutral-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-200">Version {ver.versionNumber}</span>
                  <button
                    onClick={() => handleRestoreVersion(ver)}
                    className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 text-[11px] font-medium transition-colors"
                  >
                    Restore
                  </button>
                </div>
                <div className="text-[11px] text-neutral-400">{ver.summary || 'Content snapshot'}</div>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
                  <span>{ver.updatedByUser?.name || 'Engineer'}</span>
                  <span>·</span>
                  <span>{new Date(ver.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Share Document Modal */}
      {isShareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-400" />
                Share & Collaborate
              </h3>
              <button onClick={() => setIsShareModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Anyone with access in this workspace can edit and view real-time changes simultaneously.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-300">Document URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={window.location.href}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-400 font-mono focus:outline-hidden"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Document link copied to clipboard!');
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shrink-0"
                >
                  Copy Link
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 text-xs text-neutral-500">
              Permission: <span className="text-emerald-400 font-semibold">Workspace Members Can Edit</span>
            </div>
          </div>
        </div>
      )}

      {/* Editor CSS styles for rich text elements */}
      <style>{`
        .editor-body h1 {
          font-size: 1.85rem;
          font-weight: 700;
          color: #f8fafc;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.25;
        }
        .editor-body h2 {
          font-size: 1.45rem;
          font-weight: 600;
          color: #f1f5f9;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }
        .editor-body h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .editor-body p {
          margin-bottom: 0.85rem;
        }
        .editor-body ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.85rem;
        }
        .editor-body ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.85rem;
        }
        .editor-body li {
          margin-bottom: 0.25rem;
        }
        .editor-body blockquote {
          border-left: 3px solid #3b82f6;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #94a3b8;
          font-style: italic;
        }
        .editor-body pre {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.875rem;
          color: #38bdf8;
        }
        .editor-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.25rem 0;
          font-size: 0.875rem;
        }
        .editor-body th {
          border: 1px solid #334155;
          padding: 8px 12px;
          background: #1e293b;
          text-align: left;
          font-weight: 600;
          color: #f1f5f9;
        }
        .editor-body td {
          border: 1px solid #334155;
          padding: 8px 12px;
        }
        .editor-body hr {
          border: none;
          border-top: 1px solid #334155;
          margin: 1.5rem 0;
        }
      `}</style>
    </div>
  );
};
