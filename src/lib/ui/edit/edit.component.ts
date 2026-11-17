import { ChangeDetectionStrategy, Component, Signal, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BaseComponent, DatetimeService, RequestType } from '@cartesianui/platform-common';
import { Role, Permission, PermissionsWidgetComponent, RolesLookupWidgetComponent, PermissionsLookupWidgetComponent, RolesWidgetComponent } from '@cartesianui/system-auth';
import { ImagePickerComponent } from '@cartesianui/shared-gallery';
import { User, UserApp, UserPermission, UserRole, tenantLoginAccess } from '../../models';
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

  // ── Apps tab: per-user app access (owner, 2026-11-17) ───────────────────────────────────────────
  // Which logged-in apps (Admin, POS, Care) this user may sign in to. A domain that serves an app
  // refuses a user not allowed into it, at login and on every request. Explicit grant only (owner,
  // 2026-11-17): the switches show the user's real rows, and none on means no app.

  /** The apps as the server last answered, each with `allowed`. */
  protected readonly apps = signal<UserApp[]>([]);

  /** The toggles as the operator has them, by app id. */
  protected readonly appToggles = signal<Record<string, boolean>>({});

  protected readonly savingApps = signal(false);

  protected readonly appsChanged = computed(() =>
    this.apps().some((app) => !!this.appToggles()[app.id] !== app.allowed)
  );

  protected readonly noAppAllowed = computed(() =>
    this.apps().length > 0 && !this.apps().some((app) => this.appToggles()[app.id])
  );

  private readonly appsEffect = effect(() => {
    const id = this.user()?.id;
    if (id) this.loadApps(id);
  });

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
        newPassword: this.formGroupCredentails.controls.newPassword.value,
        newPasswordConfirmation: this.formGroupCredentails.controls.confirmPassword.value
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

  private loadApps(id: string): void {
    this.subscriptions.push(
      this.sb.userApps(id).subscribe({
        next: (res: any) => this.setApps(res?.data ?? res ?? [])
      })
    );
  }

  private setApps(apps: UserApp[]): void {
    this.apps.set(apps);
    this.appToggles.set(Object.fromEntries(apps.map((app) => [app.id, !!app.allowed])));
  }

  onToggleApp(appId: string, allowed: boolean): void {
    this.appToggles.update((toggles) => ({ ...toggles, [appId]: allowed }));
  }

  /** Save the toggles exactly: each app on is one row; none on is saved too, and means no app. */
  onSaveApps(): void {
    const id = this.user()?.id;
    if (!id || this.savingApps()) return;
    const appIds = this.apps().filter((app) => this.appToggles()[app.id]).map((app) => app.id);
    this.savingApps.set(true);
    this.subscriptions.push(
      this.sb.syncUserApps(id, appIds).subscribe({
        next: (res: any) => {
          this.savingApps.set(false);
          this.setApps(res?.data ?? res ?? []);
          this.notify.success('App access saved', 'Success');
        },
        error: () => this.savingApps.set(false)
      })
    );
  }

  onSelectTab(data: TabDirective): void {
    this.activeTab = data.heading;
  }
}
