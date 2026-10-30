import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Check,
  X,
  AlertCircle,
  MoreVertical,
  Trash2,
  Lock,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { UserRole } from '../../types/index.ts';
import {
  canInviteMembers,
  canManageMemberRole,
  getRoleBadgeColor,
} from '../../utils/permissions.ts';

export const WorkspaceTeamView: React.FC = () => {
  const { currentWorkspace, members, refreshWorkspaceData } = useWorkspace();
  const { user } = useAuth();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const myRole = (currentUserMember?.role || 'member') as UserRole;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !currentWorkspace) return;
    setIsSubmitting(true);
    setInviteStatus(null);

    try {
      const res = await api.inviteMember(currentWorkspace.id, inviteEmail, inviteRole);
      setInviteStatus(res.message);
      setInviteEmail('');
      await refreshWorkspaceData();
      setTimeout(() => setIsInviteOpen(false), 1500);
    } catch (err: any) {
      setInviteStatus(err.message || 'Failed to dispatch invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: UserRole) => {
    if (!currentWorkspace) return;
    try {
      await api.updateMemberRole(currentWorkspace.id, targetUserId, newRole);
      await refreshWorkspaceData();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!currentWorkspace) return;
    if (confirm('Are you sure you want to remove this collaborator from the workspace?')) {
      try {
        await api.removeMember(currentWorkspace.id, targetUserId);
        await refreshWorkspaceData();
      } catch (err) {
        console.error('Failed to remove member:', err);
      }
    }
  };

  const permissionsMatrix = [
    { action: 'View documents and tasks', owner: true, admin: true, member: true, viewer: true },
    { action: 'Create & edit documents', owner: true, admin: true, member: true, viewer: false },
    { action: 'Manage sprint tasks & status', owner: true, admin: true, member: true, viewer: false },
    { action: 'Post comments and discussions', owner: true, admin: true, member: true, viewer: true },
    { action: 'Invite new team members', owner: true, admin: true, member: false, viewer: false },
    { action: 'Manage member roles & permissions', owner: true, admin: true, member: false, viewer: false },
    { action: 'Delete documents permanently', owner: true, admin: true, member: false, viewer: false },
    { action: 'Workspace billing & deletion', owner: true, admin: false, member: false, viewer: false },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>Team & Access Control</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Manage collaborators, assign role-based permissions, and dispatch workspace invitations.
          </p>
        </div>

        {canInviteMembers(myRole) && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Collaborator</span>
          </button>
        )}
      </div>

      {/* Members List Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-200">
            Active Workspace Collaborators ({members.length})
          </span>
          <span className="text-xs text-neutral-500 font-mono">Workspace: {currentWorkspace?.name}</span>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 font-semibold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-5">Member</th>
              <th className="py-3 px-5">Title / Specialty</th>
              <th className="py-3 px-5">Workspace Role</th>
              <th className="py-3 px-5">Joined</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {members.map((member) => {
              const badge = getRoleBadgeColor(member.role);
              const isSelf = member.userId === user?.id;
              const canEditThisRole = canManageMemberRole(myRole, member.role) && !isSelf;

              return (
                <tr key={member.userId} className="hover:bg-neutral-850/40 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.user.avatarUrl}
                        alt={member.user.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-neutral-700"
                      />
                      <div>
                        <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
                          {member.user.name}
                          {isSelf && (
                            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 rounded">You</span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono">{member.user.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-5 text-neutral-300 font-medium">
                    {member.user.roleTitle || 'Engineer'}
                  </td>

                  <td className="py-3 px-5">
                    {canEditThisRole ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.userId, e.target.value as UserRole)}
                        className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-200 capitalize focus:outline-hidden"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {member.role}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-5 text-neutral-400 font-mono text-[11px]">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>

                  <td className="py-3 px-5 text-right">
                    {canEditThisRole && member.role !== 'owner' ? (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-1 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remove member"
                        aria-label="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-neutral-600 text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xs space-y-2">
        <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-950/60 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-semibold text-neutral-200">Role-Based Access Control (RBAC) Matrix</h2>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 font-semibold uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-5">Capability</th>
              <th className="py-2.5 px-4 text-center">Owner</th>
              <th className="py-2.5 px-4 text-center">Admin</th>
              <th className="py-2.5 px-4 text-center">Member</th>
              <th className="py-2.5 px-4 text-center">Viewer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 font-mono">
            {permissionsMatrix.map((row, i) => (
              <tr key={i} className="hover:bg-neutral-850/40">
                <td className="py-2.5 px-5 text-neutral-300 font-sans">{row.action}</td>
                <td className="py-2.5 px-4 text-center">
                  {row.owner ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-neutral-600 mx-auto" />}
                </td>
                <td className="py-2.5 px-4 text-center">
                  {row.admin ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-neutral-600 mx-auto" />}
                </td>
                <td className="py-2.5 px-4 text-center">
                  {row.member ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-neutral-600 mx-auto" />}
                </td>
                <td className="py-2.5 px-4 text-center">
                  {row.viewer ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-neutral-600 mx-auto" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setIsInviteOpen(false)}
        >
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                Invite Team Member
              </h3>
              <button onClick={() => setIsInviteOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              {inviteStatus && (
                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                  {inviteStatus}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Collaborator Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-hidden"
                >
                  <option value="admin">Admin — Full workspace management</option>
                  <option value="member">Member — Create and edit documents & tasks</option>
                  <option value="viewer">Viewer — Read-only access & comments</option>
                </select>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
