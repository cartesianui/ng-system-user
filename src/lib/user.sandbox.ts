import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Sandbox, EntitySandbox } from '@cartesianui/platform-common';
import { fromUser, UserActions } from './store';
import { User, UserRole, UserPermission } from './models';
import { IInviteUserPayload, UserHttpService } from './shared';

@Injectable()
export class UserSandbox extends Sandbox {

  private store = inject(Store);
  private userHttpService = inject(UserHttpService);

  user = new EntitySandbox<User>(this.store, this.injector, {
    selectors: fromUser,
    actions: UserActions,
    model: User
  });

  updateUserCredentials(id: string, credentials: { currentPassword: string; newPassword: string }): void {
    this.store.dispatch(UserActions.updateUserCredentials({ user: { id, changes: credentials } }));
  }

  attachRoles(id: string, form: UserRole): void {
    this.store.dispatch(UserActions.attachRoles({ id, form }));
  }

  detachRoles(id: string, form: UserRole): void {
    this.store.dispatch(UserActions.detachRoles({ id, form }));
  }

  attachPermissions(id: string, form: UserPermission): void {
    this.store.dispatch(UserActions.attachPermissions({ id, form }));
  }

  detachPermissions(id: string, form: UserPermission): void {
    this.store.dispatch(UserActions.detachPermissions({ id, form }));
  }

  /**
   * Passthrough (rulebook #6.3c): a one-shot side effect (an email). The edit screen subscribes for the
   * toast, then re-fetches the user, since an invite can give a record its username.
   */
  inviteUser(id: string, body: IInviteUserPayload = {}): Observable<any> {
    return this.userHttpService.invite(id, body);
  }
}
