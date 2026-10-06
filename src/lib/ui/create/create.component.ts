import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject } from '@angular/core';
import { Validators } from '@angular/forms';
import { ENTITY_CONSTRUCTOR, FormBaseComponent, RequestType } from '@cartesianui/platform-common';
import { UserSandbox } from '../../user.sandbox';
import { User } from '../../models';
import { FORM_IMPORTS } from '../../user.imports';

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
export class CreateUserComponent extends FormBaseComponent<User> implements OnDestroy {

  protected sb = inject(UserSandbox);

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
    this.formGroup.get('password')?.addValidators(Validators.required);
    this.formGroup.get('password')?.updateValueAndValidity();
  }

  onSave(): void {
    if (!this.formGroup.valid) return;
    const entity = this.getEntityFromForm();
    this.sb.user.create(entity);
  }
}
