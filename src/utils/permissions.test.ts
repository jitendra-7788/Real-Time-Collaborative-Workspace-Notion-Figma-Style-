import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canManageWorkspace,
  canDeleteWorkspace,
  canInviteMembers,
  canManageMemberRole,
  canEditDocument,
  canDeleteDocument,
  canCreateTask,
  canManageTask,
} from './permissions.ts';

test('permissions: workspace management rights', () => {
  assert.equal(canManageWorkspace('owner'), true);
  assert.equal(canManageWorkspace('admin'), true);
  assert.equal(canManageWorkspace('member'), false);
  assert.equal(canManageWorkspace('viewer'), false);

  assert.equal(canDeleteWorkspace('owner'), true);
  assert.equal(canDeleteWorkspace('admin'), false);
  assert.equal(canDeleteWorkspace('member'), false);
});

test('permissions: member invitations and role changes', () => {
  assert.equal(canInviteMembers('admin'), true);
  assert.equal(canInviteMembers('viewer'), false);

  assert.equal(canManageMemberRole('owner', 'admin'), true);
  assert.equal(canManageMemberRole('admin', 'admin'), false);
  assert.equal(canManageMemberRole('admin', 'member'), true);
  assert.equal(canManageMemberRole('admin', 'viewer'), true);
  assert.equal(canManageMemberRole('member', 'viewer'), false);
});

test('permissions: document and task actions', () => {
  assert.equal(canEditDocument('member'), true);
  assert.equal(canEditDocument('viewer'), false);

  assert.equal(canDeleteDocument('admin', false), true);
  assert.equal(canDeleteDocument('member', true), true);
  assert.equal(canDeleteDocument('member', false), false);
  assert.equal(canDeleteDocument('viewer', true), false);

  assert.equal(canCreateTask('member'), true);
  assert.equal(canCreateTask('viewer'), false);
  assert.equal(canManageTask('member', true), true);
  assert.equal(canManageTask('member', false), false);
});
