import { ChangeDetectionStrategy, Component, Signal, OnDestroy, effect, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { BaseComponent, DatetimeService, RequestType } from '@cartesianui/platform-common';
import { Role, Permission, PermissionsWidgetComponent, RolesLookupWidgetComponent, PermissionsLookupWidgetComponent, RolesWidgetComponent } from '@cartesianui/system-auth';
import { ImagePickerComponent } from '@cartesianui/shared-gallery';
import { User, UserPermission, UserRole } from '../../models';
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
    birth: new FormControl('', [])
  });

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
          birth: DatetimeService.fromJSDate(new Date(this.formGroup.controls.birth.value)).toISO()
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
