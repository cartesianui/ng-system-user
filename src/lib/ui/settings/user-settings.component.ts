import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, computed, effect, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BaseComponent, DatetimeService, RequestType } from '@cartesianui/platform-common';
import { ImagePickerComponent } from '@cartesianui/shared-gallery';
import { TabDirective } from 'ngx-bootstrap/tabs';
import { User } from '../../models';
import { UserSandbox } from '../../user.sandbox';
import { FORM_IMPORTS } from '../../user.imports';
import { UserConfigurationComponent } from '../configuration/user-configuration.component';

/**
 * Self-edit landing page used by the Settings hub at `/settings/user`.
 *
 * Composes the user-edit "General" surface (profile + security) with the
 * existing `<user-configuration>` (time zone / clock provider). Always
 * scoped to the currently authenticated user — no `id` input needed.
 *
 * For admin-edit of another user, use `<edit-user>` directly via the
 * users listing flow.
 */
@Component({
    selector: 'user-settings',
    templateUrl: './user-settings.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ...FORM_IMPORTS,
        ImagePickerComponent,
        UserConfigurationComponent,
    ],
    standalone: true,
})
export class UserSettingsComponent extends BaseComponent implements OnInit, OnDestroy {

  protected sb = inject(UserSandbox);
  private cdr = inject(ChangeDetectorRef);

  /** Authenticated user id resolved from `cartesian.session.userId`. */
  readonly userId = computed(() => (cartesian.session as any)?.userId?.toString() ?? null);

  readonly user = this.sb.user.selected;

  formGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    gender: new FormControl(''),
    birth: new FormControl(''),
  });

  formGroupCredentials = new FormGroup({
    currentPassword: new FormControl(''),
    newPassword: new FormControl(''),
    confirmPassword: new FormControl(''),
  });

  activeTab = 'Profile';

  private readonly hydrateEffect = effect(() => {
    const user = this.user();
    if (!user) return;
    const patched = { ...user, birth: user.birth ? DatetimeService.toJSDate(user.birth) : '' } as any;
    this.formGroup.patchValue(patched);
    this.cdr.markForCheck();
  });

  private readonly updateCompletedEffect = effect(() => {
    if (!this.sb.user.updateCompleted()) return;
    this.notify.success('Successfully Updated', 'Success');
    this.sb.user.clearRequestState(RequestType.Update);
  });

  ngOnInit(): void {
    const id = this.userId();
    if (!id) return;
    this.sb.user.getById(id);
  }

  onSelectTab(data: TabDirective): void {
    this.activeTab = data.heading;
  }

  onUpdateProfile(): void {
    if (!this.formGroup.dirty || !this.formGroup.valid) return;
    const id = this.userId();
    if (!id) return;
    this.sb.user.update(
      id,
      new User({
        name: this.formGroup.controls.name.value,
        gender: this.formGroup.controls.gender.value,
        birth: this.formGroup.controls.birth.value
          ? DatetimeService.fromJSDate(new Date(this.formGroup.controls.birth.value)).toISO()
          : null,
      }),
    );
  }

  onUpdateCredentials(): void {
    if (!this.formGroupCredentials.dirty || !this.formGroupCredentials.valid) return;
    const id = this.userId();
    if (!id) return;
    this.sb.updateUserCredentials(id, {
      currentPassword: this.formGroupCredentials.controls.currentPassword.value || '',
      newPassword: this.formGroupCredentials.controls.newPassword.value || '',
    });
  }
}
