import { ChangeDetectionStrategy, Component, Signal, OnDestroy, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BaseComponent, DatetimeService, RequestType } from '@cartesianui/platform-common';
import { Role, Permission, PermissionsWidgetComponent, RolesLookupWidgetComponent, PermissionsLookupWidgetComponent, RolesWidgetComponent } from '@cartesianui/system-auth';
import { ImagePickerComponent } from '@cartesianui/shared-gallery';
import { User, UserPermission, UserRole, tenantLoginAccess } from '../../models';
import { UserSandbox } from '../../user.sandbox';
import { TabDirective } from 'ngx-bootstrap/tabs';
import { FORM_IMPORTS } from '../../user.imports';

@Component({
    selector: 'edit-user',
    templateUrl: './edit.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
      ...FORM_IMPORTS,
      PermissionsWidgetComponent,
      PermissionsLookupWidgetComponent,
      RolesWidgetComponent,
      RolesLookupWidgetComponent,
      ImagePickerComponent,
    ],
    standalone: true
})
export class EditUserComponent extends BaseComponent implements OnDestroy {

  protected sb = inject(UserSandbox);

  readonly user: Signal<User> = this.sb.user.selected;

  rolesToRevoke: Role[] = [];
  rolesToAttachControl = new FormControl<Role['id'][]>([], { nonNullable: true });

  permissionsToAttach: Permission[] = [];
  permissionsToRevoke: Permission[] = [];

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', []),
    gender: new FormControl('Gender', []),
    birth: new FormControl('', []),
    nationalId: new FormControl('', [Validators.maxLength(50)])
  });

  /** The tenant's `user_management.login_access_user`: the invite is offered only while it is on. */
  protected readonly canLogIn = tenantLoginAccess('user');

  /** True while an invite request is in flight; disables the button. */
  readonly inviting = signal(false);

  formGroupCredentails: FormGroup = new FormGroup({
    currentPassword: new FormControl('', []),
    newPassword: new FormControl('', []),
    confirmPassword: new FormControl('', [])
  });

  activeTab: string = 'General';

  private readonly selectEffect = effect(() => {
    const user = this.user();
    if (!user) return;
    const patched = { ...user, birth: DatetimeService.toJSDate(user.birth) } as User;
    this.formGroup.patchValue(patched);
  });

  private readonly busyEffect = effect(() => {
    // Can handle form busy state here if needed
  });

  private readonly completeEffect = effect(() => {
    if (!this.sb.user.updateCompleted()) return;
    this.notify.success('Successfully Updated', 'Success');
    this.sb.user.clearRequestState(RequestType.Update);
  });

  onUpdate() {
    if (this.formGroup.dirty && this.formGroup.valid) {
      this.sb.user.update(
        this.user()?.id,
        new User({
          name: this.formGroup.controls.name.value,
          gender: this.formGroup.controls.gender.value,
          birth: DatetimeService.fromJSDate(new Date(this.formGroup.controls.birth.value)).toISO(),
          // Blank clears it: `PATCH {"national_id": null}`.
          nationalId: this.formGroup.controls.nationalId.value || null
        })
      );
    }

    if (this.formGroupCredentails.dirty && this.formGroupCredentails.valid) {
      this.sb.updateUserCredentials(this.user()?.id, {
        currentPassword: this.formGroupCredentails.controls.currentPassword.value,
        newPassword: this.formGroupCredentails.controls.newPassword.value
      });
    }
  }

  /**
   * `POST /v1/users/{id}/invite`: a record gets a username (its email), an account keeps its own; either way a
   * fresh set-password link is emailed and older links stop working. A 422 (no email, a username clash, an
   * AI or system user) is shown by the global error toast with the server's message.
   */
  onInvite(): void {
    const user = this.user();
    if (!user?.id || !user.email || this.inviting()) return;
    this.inviting.set(true);
    this.subscriptions.push(
      this.sb.inviteUser(user.id).subscribe({
        next: () => {
          this.inviting.set(false);
          this.notify.success(`A set-password link was sent to ${user.email}.`, 'Link sent');
          // The invite may have given a record its username; reload so the read-only field shows it.
          this.sb.user.getById(user.id, 'roles,permissions,image');
        },
        error: () => this.inviting.set(false)
      })
    );
  }

  onRevoke() {
    const roleIds = this.rolesToRevoke.map((role) => role.id);
    const form = new UserRole({
      userId: this.user()?.id,
      roleIds
    });
    this.sb.detachRoles(this.user()?.id, form);
    this.rolesToRevoke = [];
  }

  onAttach() {
    const roleIds = this.rolesToAttachControl.value || [];
    const form = new UserRole({
      userId: this.user()?.id,
      roleIds
    });
    this.sb.attachRoles(this.user()?.id, form);
    this.rolesToAttachControl.reset([], { emitEvent: false });
  }

  onRevokePermissions() {
    const permissionIds = this.permissionsToRevoke.map((permission) => permission.id);
    const form = new UserPermission({
      userId: this.user()?.id,
      permissionIds
    });
    this.sb.detachPermissions(this.user()?.id, form);
    this.permissionsToRevoke = [];
  }

  onAttachPermissions() {
    const permissionIds = this.permissionsToAttach.map((permission) => permission.id);
    const form = new UserPermission({
      userId: this.user()?.id,
      permissionIds
    });
    this.sb.attachPermissions(this.user()?.id, form);
    this.permissionsToAttach = [];
  }

  onSelectTab(data: TabDirective): void {
    this.activeTab = data.heading;
  }
}
