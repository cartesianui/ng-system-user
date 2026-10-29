import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { ENTITY_CONSTRUCTOR, FormBaseComponent, RequestType } from '@cartesianui/platform-common';
import { RequestCriteriaFactory } from '@cartesianui/platform-core';
import { AuthorizationSandbox } from '@cartesianui/system-auth';
import { UserSandbox } from '../../user.sandbox';
import { User } from '../../models';
import { FORM_IMPORTS } from '../../user.imports';

declare const cartesian: any;

/**
 * The tenant's `user_management.login_access_staff`, from the public configuration bundle that app init
 * merges into the `cartesian` global (camelCased, like `cartesian.tax.overlayEnabled`). Unset means the
 * server default, `true`.
 */
function tenantLoginAccessStaff(): boolean {
  const value = typeof cartesian !== 'undefined' ? cartesian?.userManagement?.loginAccessStaff : undefined;
  return !(value === false || value === 'false' || value === 0 || value === '0');
}

@Component({
    selector: 'create-user',
    templateUrl: './create.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [...FORM_IMPORTS],
    providers: [
      {
        provide: ENTITY_CONSTRUCTOR,
        useValue: User
      }
    ],
    standalone: true
})
export class CreateUserComponent extends FormBaseComponent<User> implements OnInit, OnDestroy {

  protected sb = inject(UserSandbox);
  private authSb = inject(AuthorizationSandbox);
  private criteriaFactory = inject(RequestCriteriaFactory);

  /**
   * Roles the admin may assign: `GET /v1/roles` is tenant-scoped, and `POST /v1/users` refuses a role of
   * another tenant, so the tenant's roles ARE the assignable set.
   */
  protected readonly roleOptions = computed(() =>
    (this.authSb.role.entities() ?? []).map((role) => ({ value: role.id, name: role.displayName || role.name }))
  );

  /** Mirrors the "Can log in" checkbox; username and password are shown only while it is on. */
  protected readonly canLogIn = signal(true);

  private readonly busyEffect = effect(() => {
    this.handleFormBusyState(this.sb.user.createState());
  });

  private readonly completeEffect = effect(() => {
    if (!this.sb.user.createCompleted()) return;
    this.created.emit(true);
    this.notify.success('Successfully Created', 'Success');
    this.sb.user.clearRequestState(RequestType.Create);
  });

  constructor() {
    super(User);
    this.initForm();
    // Create-only rule (rulebook #8.7): every new user gets a role. Email and password are optional.
    this.formGroup.get('roleId')?.addValidators(Validators.required);
    this.formGroup.get('roleId')?.updateValueAndValidity();
    this.formGroup.get('loginAccess')?.setValue(tenantLoginAccessStaff());
    this.canLogIn.set(this.formGroup.get('loginAccess')?.value === true);
  }

  ngOnInit(): void {
    this.authSb.role.getAll(this.criteriaFactory.create().limit(100000).httpParams());
    this.subscriptions.push(
      this.formGroup.get('loginAccess')!.valueChanges.subscribe((on: boolean) => {
        this.canLogIn.set(on === true);
        if (!on) {
          // A record cannot log in: the server drops username and password anyway, so clear them here
          // rather than leave hidden values (and their validation) behind.
          this.formGroup.patchValue({ username: '', password: '', confirmPassword: '' });
        }
      })
    );
  }

  onSave(): void {
    if (!this.formGroup.valid) return;
    const entity = this.getEntityFromForm();
    entity.loginAccess = this.formGroup.get('loginAccess')?.value === true;
    // An ABSENT `username` lets the server default it to the email; an empty one would arrive as null,
    // which the server reads as "no login". So a blank username is left out, never sent.
    if (!entity.username?.trim() || !entity.loginAccess) {
      delete entity.username;
    }
    if (!entity.loginAccess) {
      delete (entity as any).password;
      delete (entity as any).confirmPassword;
    }
    this.sb.user.create(entity);
  }
}
