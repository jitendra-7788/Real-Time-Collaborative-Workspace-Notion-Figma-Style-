import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Check,
  ChevronDown,
  Layers,
  Plus,
  Radio,
  User as UserIcon,
  LogOut,
  Settings,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { realtime } from '../../services/socket.ts';

interface TopBarProps {
  onOpenAuth: () => void;
  onOpenCreateWorkspace: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenAuth, onOpenCreateWorkspace }) => {
  const {
    currentWorkspace,
    workspaces,
    setCurrentWorkspaceId,
    activeView,
    setActiveView,
    activeDocId,
    setActiveDocId,
    documents,
    setIsSearchOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useWorkspace();
  const { user, logout, switchDemoUser, demoUsers } = useAuth();

  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const wsDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = realtime.onConnectionChange((connected) => {
      setIsWsConnected(connected);
    });
    return unsub;
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
        setIsWsDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const currentDoc = activeDocId ? documents.find((d) => d.id === activeDocId) : null;

  const viewTitles: Record<string, string> = {
    dashboard: 'Workspace Overview',
    document: currentDoc ? currentDoc.title : 'Document Editor',
    tasks: 'Sprint Tasks & Kanban',
    team: 'Team & Permissions',
    settings: 'Workspace Settings',
  };

  return (
    <header className="h-14 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md px-4 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Zone 1: Brand & Workspace Switcher */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => {
            setActiveView('dashboard');
          }}
          className="flex items-center gap-2 text-left cursor-pointer group"
          aria-label="Kortex Home"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-tight shadow-xs shadow-blue-500/20 group-hover:scale-105 transition-transform">
            K
          </div>
          <span className="text-base font-bold tracking-tight text-neutral-100 hidden sm:inline whitespace-nowrap">
            Kortex
          </span>
        </button>

        <span className="text-neutral-700 hidden sm:inline">/</span>

        {/* Workspace selector dropdown */}
        <div className="relative" ref={wsDropdownRef}>
          <button
            onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
            aria-expanded={isWsDropdownOpen}
            aria-label="Switch workspace"
          >
            <span>{currentWorkspace?.icon || '⚡'}</span>
            <span className="max-w-[120px] sm:max-w-[180px] truncate">{currentWorkspace?.name || 'Workspace'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {isWsDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl py-1.5 z-40">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Your Workspaces
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setCurrentWorkspaceId(ws.id);
                    setIsWsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                    ws.id === currentWorkspace?.id
                      ? 'bg-blue-600/15 text-blue-300 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{ws.icon}</span>
                    <span className="truncate">{ws.name}</span>
                  </div>
                  {ws.id === currentWorkspace?.id && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                </button>
              ))}

              <div className="border-t border-neutral-800 my-1"></div>

              <button
                onClick={() => {
                  setIsWsDropdownOpen(false);
                  onOpenCreateWorkspace();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>Create New Workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zone 2: Breadcrumbs & View status */}
      <div className="hidden md:flex items-center gap-2 text-xs text-neutral-400 truncate flex-1 min-w-0">
        <span className="hover:text-neutral-200 cursor-pointer" onClick={() => setActiveView('dashboard')}>
          {currentWorkspace?.name}
        </span>
        <span>/</span>
        <span className="text-neutral-200 font-medium truncate">{viewTitles[activeView]}</span>
      </div>

      {/* Zone 3: Actions, Search, Live sync, Notifications, Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Global Search Button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          aria-label="Search workspace (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden lg:inline bg-neutral-800 border border-neutral-700 px-1.5 py-0.2 rounded text-[10px] font-mono text-neutral-400">
            ⌘K
          </kbd>
        </button>

        {/* Real-time Connection Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono border ${
            isWsConnected
              ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
              : 'bg-amber-950/40 border-amber-800/40 text-amber-400'
          }`}
          title={isWsConnected ? 'Connected to Kortex Realtime Mesh' : 'Reconnecting to Realtime Mesh...'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isWsConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="hidden xl:inline">{isWsConnected ? 'Live Sync' : 'Reconnecting'}</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-800"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-neutral-950" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-1.5 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-2 z-40">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800">
                <span className="text-xs font-semibold text-neutral-200">
                  Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsRead()}
                    className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-neutral-800/60">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-neutral-500">No new notifications</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id);
                        setIsNotifOpen(false);
                        if (notif.link?.startsWith('/document/')) {
                          const docId = notif.link.replace('/document/', '');
                          setActiveDocId(docId);
                          setActiveView('document');
                        } else if (notif.link === '/tasks') {
                          setActiveView('tasks');
                        }
                      }}
                      className={`p-3 text-left hover:bg-neutral-800/60 transition-colors cursor-pointer ${
                        !notif.isRead ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-neutral-200">{notif.title}</span>
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Persona Switcher */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer"
            aria-label="User menu"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-neutral-700"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <span className="text-xs font-medium text-neutral-200 hidden lg:inline max-w-[90px] truncate">
              {user?.name?.split(' ')[0] || 'User'}
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-2 z-40">
              <div className="px-3 py-2 border-b border-neutral-800">
                <div className="text-xs font-semibold text-neutral-100 truncate">{user?.name}</div>
                <div className="text-[11px] text-neutral-400 truncate">{user?.email}</div>
                <div className="text-[10px] text-blue-400 mt-0.5">{user?.roleTitle}</div>
              </div>

              {/* Quick Persona Switcher */}
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Switch Collaborator Persona
              </div>
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    switchDemoUser(u.id);
                    setIsUserMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                    u.id === user?.id ? 'bg-blue-600/15 text-blue-300 font-semibold' : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <img src={u.avatarUrl} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                    <span className="truncate">{u.name}</span>
                  </div>
                  {u.id === user?.id && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                </button>
              ))}

              <div className="border-t border-neutral-800 my-1"></div>

              <button
                onClick={() => {
                  setActiveView('settings');
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-neutral-400" />
                <span>Account & Settings</span>
              </button>

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onOpenAuth();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                <span>Sign in with Another Account</span>
              </button>

              <button
                onClick={() => {
                  logout();
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
