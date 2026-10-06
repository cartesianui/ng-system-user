import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { BaseComponent } from '@cartesianui/platform-common';
import { UserSandbox } from '../../user.sandbox';
import { FORM_IMPORTS } from '../../user.imports';

/**
 * User security self-edit (password change). Surfaces under Settings →
 * Account → Security at `/settings/security`. Extracted from the
 * previous combined `UserSettingsComponent` tabset as part of the
 * admin-nav-redesign Phase 2 split.
 */
@Component({
  selector: 'user-security',
  templateUrl: './user-security.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...FORM_IMPORTS],
  standalone: true,
})
export class UserSecurityComponent extends BaseComponent {
  protected sb = inject(UserSandbox);

  /** Authenticated user id resolved from `cartesian.session.userId`. */
  readonly userId = computed(() => (cartesian.session as any)?.userId?.toString() ?? null);

  formGroupCredentials = new FormGroup({
    currentPassword: new FormControl(''),
    newPassword: new FormControl(''),
    confirmPassword: new FormControl(''),
  });

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