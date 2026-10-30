export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface UserPermissionContext {
  userId: string;
  role: UserRole;
  isWorkspaceOwner: boolean;
}

export function canManageWorkspace(role: UserRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canDeleteWorkspace(role: UserRole): boolean {
  return role === 'owner';
}

export function canInviteMembers(role: UserRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageMemberRole(currentRole: UserRole, targetRole: UserRole): boolean {
  if (currentRole === 'owner') return true;
  if (currentRole === 'admin') {
    return targetRole === 'member' || targetRole === 'viewer';
  }
  return false;
}

export function canEditDocument(role: UserRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'member';
}

export function canDeleteDocument(role: UserRole, isDocCreator: boolean): boolean {
  if (role === 'owner' || role === 'admin') return true;
  if (role === 'member' && isDocCreator) return true;
  return false;
}

export function canCreateTask(role: UserRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'member';
}

export function canManageTask(role: UserRole, isAssigneeOrCreator: boolean): boolean {
  if (role === 'owner' || role === 'admin') return true;
  if (role === 'member' && isAssigneeOrCreator) return true;
  return false;
}

export function getRoleBadgeColor(role: UserRole): { bg: string; text: string; border: string } {
  switch (role) {
    case 'owner':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    case 'admin':
      return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' };
    case 'member':
      return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };
    case 'viewer':
      return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
  }
}
