import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, CheckSquare, User as UserIcon, X, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { api } from '../../services/api.ts';
import { DocumentItem, TaskItem, User } from '../../types/index.ts';

export const GlobalSearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, currentWorkspace, setActiveDocId, setActiveView } = useWorkspace();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ documents: DocumentItem[]; tasks: TaskItem[]; members: User[] }>({
    documents: [],
    tasks: [],
    members: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults({ documents: [], tasks: [], members: [] });
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!query.trim() || !currentWorkspace) {
      setResults({ documents: [], tasks: [], members: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.search(currentWorkspace.id, query);
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, currentWorkspace]);

  if (!isSearchOpen) return null;

  const totalResults = results.documents.length + results.tasks.length + results.members.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs p-4"
      onClick={() => setIsSearchOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Global Search"
    >
      <div
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-neutral-800 gap-3">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, tasks, members... (Esc to close)"
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-neutral-400 hover:text-neutral-200 text-xs px-2 py-1 rounded bg-neutral-800"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-neutral-400 hover:text-neutral-200"
            aria-label="Close search modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {isLoading && (
            <div className="py-8 text-center text-xs text-neutral-400">Searching workspace assets...</div>
          )}

          {!isLoading && query && totalResults === 0 && (
            <div className="py-12 text-center text-sm text-neutral-400">
              No results found for &ldquo;<span className="text-neutral-200">{query}</span>&rdquo;
            </div>
          )}

          {!query && (
            <div className="py-8 text-center text-xs text-neutral-500">
              Type to search documents, sprint tasks, or team members across <span className="text-neutral-300">{currentWorkspace?.name}</span>
            </div>
          )}

          {/* Document Results */}
          {results.documents.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-3 py-1">
                Documents ({results.documents.length})
              </div>
              <div className="space-y-1 mt-1">
                {results.documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setActiveDocId(doc.id);
                      setActiveView('document');
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-800/70 text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base shrink-0">{doc.icon || '📄'}</span>
                      <div className="truncate">
                        <div className="text-sm font-medium text-neutral-200 group-hover:text-blue-400 transition-colors truncate">
                          {doc.title}
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                          {doc.wordCount} words · {doc.readingMinutes} min read
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Task Results */}
          {results.tasks.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-3 py-1">
                Tasks ({results.tasks.length})
              </div>
              <div className="space-y-1 mt-1">
                {results.tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      setActiveView('tasks');
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-800/70 text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-sm font-medium text-neutral-200 group-hover:text-emerald-400 transition-colors truncate">
                          {task.title}
                        </div>
                        <div className="text-xs text-neutral-500 capitalize">
                          Status: {task.status.replace('_', ' ')} · Priority: {task.priority}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Member Results */}
          {results.members.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-3 py-1">
                Team Members ({results.members.length})
              </div>
              <div className="space-y-1 mt-1">
                {results.members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setActiveView('team');
                      setIsSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-800/70 text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-6 h-6 rounded-full object-cover shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-sm font-medium text-neutral-200 group-hover:text-purple-400 transition-colors truncate">
                          {member.name}
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                          {member.roleTitle} · {member.email}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Navigate with mouse or keyboard</span>
          <div className="flex items-center gap-2">
            <span className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300 font-mono">ESC</span>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
