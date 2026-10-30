import React, { useState } from 'react';
import {
  Settings,
  User as UserIcon,
  Lock,
  Bell,
  Building,
  Check,
  AlertTriangle,
  Trash2,
  Save,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';

export const SettingsView: React.FC = () => {
  const { currentWorkspace, updateWorkspace, deleteWorkspace, setActiveView } = useWorkspace();
  const { user, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'notifications' | 'security'>('profile');

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [roleTitle, setRoleTitle] = useState(user?.roleTitle || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileSaved, setProfileSaved] = useState(false);

  // Workspace Form state
  const [wsName, setWsName] = useState(currentWorkspace?.name || '');
  const [wsDescription, setWsDescription] = useState(currentWorkspace?.description || '');
  const [wsIcon, setWsIcon] = useState(currentWorkspace?.icon || '⚡');
  const [wsSaved, setWsSaved] = useState(false);

  // Security Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  // Notification Preferences
  const [notifDocUpdates, setNotifDocUpdates] = useState(true);
  const [notifTaskAssigned, setNotifTaskAssigned] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifWeeklyDigest, setNotifWeeklyDigest] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ name, roleTitle, bio });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    await updateWorkspace(currentWorkspace.id, {
      name: wsName,
      description: wsDescription,
      icon: wsIcon,
    });
    setWsSaved(true);
    setTimeout(() => setWsSaved(false), 2000);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordStatus('New passwords do not match');
      return;
    }
    setPasswordStatus('Password successfully updated');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordStatus(null), 3000);
  };

  const handleDeleteCurrentWorkspace = async () => {
    if (!currentWorkspace) return;
    const confirmPrompt = prompt(
      `To permanently delete "${currentWorkspace.name}", type the workspace name below:`
    );
    if (confirmPrompt === currentWorkspace.name) {
      await deleteWorkspace(currentWorkspace.id);
      setActiveView('dashboard');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>Account & Workspace Settings</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Configure personal collaborator profile, workspace parameters, notifications, and security.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-800 pb-px">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Collaborator Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'workspace'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Workspace Configuration</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'notifications'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'security'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security & Passwords</span>
        </button>
      </div>

      {/* Tab 1: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
          {profileSaved && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Collaborator profile successfully updated.</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <img
              src={user?.avatarUrl}
              alt={user?.name}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-neutral-700"
            />
            <div>
              <div className="text-sm font-semibold text-neutral-200">{user?.name}</div>
              <div className="text-xs text-neutral-400 font-mono">{user?.email}</div>
              <span className="inline-block mt-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                Color token: {user?.color}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-100 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Role Title / Specialty</label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-100 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Bio / Status</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile</span>
          </button>
        </form>
      )}

      {/* Tab 2: Workspace */}
      {activeTab === 'workspace' && (
        <form onSubmit={handleSaveWorkspace} className="space-y-6 max-w-xl">
          {wsSaved && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Workspace configuration updated.</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-neutral-300 mb-1">Icon</label>
                <input
                  type="text"
                  value={wsIcon}
                  onChange={(e) => setWsIcon(e.target.value)}
                  className="w-full text-center px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xl text-neutral-100 focus:outline-hidden"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-neutral-300 mb-1">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-100 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Description</label>
              <textarea
                rows={3}
                value={wsDescription}
                onChange={(e) => setWsDescription(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Workspace URL Slug</label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-neutral-950 border border-r-0 border-neutral-800 rounded-l-lg text-xs text-neutral-500 font-mono">
                  kortex.io/ws/
                </span>
                <input
                  type="text"
                  readOnly
                  value={currentWorkspace?.slug || 'acme-eng'}
                  className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-r-lg text-xs text-neutral-400 font-mono focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Workspace</span>
          </button>

          {/* Danger Zone */}
          <div className="pt-6 border-t border-neutral-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400">Danger Zone</h3>
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-rose-300">Delete this workspace</div>
                <div className="text-[11px] text-neutral-400">
                  Permanently deletes all workspace documents, sprint tasks, and comments. This cannot be undone.
                </div>
              </div>
              <button
                type="button"
                onClick={handleDeleteCurrentWorkspace}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 3: Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 max-w-xl">
          {notifSaved && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Notification preferences saved.</span>
            </div>
          )}

          <div className="space-y-3 divide-y divide-neutral-800/80">
            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-neutral-200">Document Updates</div>
                <div className="text-[11px] text-neutral-400">Get notified when team members update your documents.</div>
              </div>
              <input
                type="checkbox"
                checked={notifDocUpdates}
                onChange={(e) => setNotifDocUpdates(e.target.checked)}
                className="w-4 h-4 rounded-sm text-blue-600 bg-neutral-900 border-neutral-700"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-neutral-200">Task Assignments</div>
                <div className="text-[11px] text-neutral-400">Instant notification when a sprint task is assigned to you.</div>
              </div>
              <input
                type="checkbox"
                checked={notifTaskAssigned}
                onChange={(e) => setNotifTaskAssigned(e.target.checked)}
                className="w-4 h-4 rounded-sm text-blue-600 bg-neutral-900 border-neutral-700"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-neutral-200">Discussions & Comments</div>
                <div className="text-[11px] text-neutral-400">Notify when someone replies to your comments or mentions you.</div>
              </div>
              <input
                type="checkbox"
                checked={notifComments}
                onChange={(e) => setNotifComments(e.target.checked)}
                className="w-4 h-4 rounded-sm text-blue-600 bg-neutral-900 border-neutral-700"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-neutral-200">Weekly Activity Digest</div>
                <div className="text-[11px] text-neutral-400">Weekly summary of sprint velocity and documents published.</div>
              </div>
              <input
                type="checkbox"
                checked={notifWeeklyDigest}
                onChange={(e) => setNotifWeeklyDigest(e.target.checked)}
                className="w-4 h-4 rounded-sm text-blue-600 bg-neutral-900 border-neutral-700"
              />
            </label>
          </div>

          <button
            onClick={() => {
              setNotifSaved(true);
              setTimeout(() => setNotifSaved(false), 2000);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      )}

      {/* Tab 4: Security */}
      {activeTab === 'security' && (
        <form onSubmit={handleSavePassword} className="space-y-6 max-w-xl">
          {passwordStatus && (
            <div
              className={`p-3 rounded-lg text-xs ${
                passwordStatus.includes('success')
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {passwordStatus}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-100 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-100 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-100 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Update Password</span>
          </button>
        </form>
      )}
    </div>
  );
};
