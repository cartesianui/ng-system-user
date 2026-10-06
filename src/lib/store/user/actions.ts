import { entityActions } from '@cartesianui/platform-common';
import { createAction, props } from '@ngrx/store';
import { IError } from '@cartesianui/platform-core';
import { User, UserRole, UserPermission } from '../../models';

const actions = entityActions<User, 'User'>('User');

const additionalActions = {
  updateUserCredentials: createAction('[User] Update User Credentials', props<{ user: { id: string; changes: { currentPassword: string; newPassword: string } } }>()),
  attachRoles: createAction('[User] Attach Roles', props<{ id: string, form: UserRole }>()),
  detachRoles: createAction('[User] Detach Roles', props<{ id: string, form: UserRole }>()),
  attachPermissions: createAction('[User] Attach Permissions', props<{ id: string, form: UserPermission }>()),
  detachPermissions: createAction('[User] Detach Permissions', props<{ id: string, form: UserPermission }>()),
};

export const UserActions = { ...actions, ...additionalActions };
