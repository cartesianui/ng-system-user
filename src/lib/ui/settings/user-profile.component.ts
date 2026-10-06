import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  effect,
  inject,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BaseComponent, DatetimeService, RequestType } from '@cartesianui/platform-common';
import { ImagePickerComponent } from '@cartesianui/shared-gallery';
import { User } from '../../models';
import { UserSandbox } from '../../user.sandbox';
import { FORM_IMPORTS } from '../../user.imports';

/**
 * User profile self-edit. Surfaces under Settings → Account → Profile.
 *
 * Hosted at the dedicated `/settings/profile` route — extracted from the
 * previous combined `UserSettingsComponent` tabset as part of the
 * admin-nav-redesign Phase 2 split.
 */
@Component({
  selector: 'user-profile',
  templateUrl: './user-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...FORM_IMPORTS, ImagePickerComponent],
  standalone: true,
})
export class UserProfileComponent extends BaseComponent implements OnInit {
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
}