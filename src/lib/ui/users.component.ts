import { ChangeDetectionStrategy, Component, OnInit, AfterViewInit, OnDestroy, effect, inject } from '@angular/core';
import { ListingControlsComponent, ENTITY_CONSTRUCTOR, RequestType, AppDatatableComponent, SearchPanelComponent } from '@cartesianui/platform-common';
import { UserSandbox } from '../user.sandbox';
import { IUser, User } from '../models';
import { LISTING_IMPORTS } from '../user.imports';
import { CreateUserComponent } from './create/create.component';
import { EditUserComponent } from './edit/edit.component';

const childComponents = {
  createUser: { id: 'createUser', title: 'Create User' },
  editUser: { id: 'editUser', title: 'Edit User' }
} as const;

type UserChildComponent = typeof childComponents;

@Component({
    templateUrl: 'users.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
      ...LISTING_IMPORTS,
      AppDatatableComponent,
      SearchPanelComponent,
      CreateUserComponent,
      EditUserComponent
    ],
    providers: [
      {
        provide: ENTITY_CONSTRUCTOR,
        useValue: User
      }
    ],
    standalone: true
})
export class UsersComponent extends ListingControlsComponent<IUser, UserChildComponent> implements OnInit, AfterViewInit, OnDestroy {
  override childComponents: UserChildComponent = childComponents;

  protected sb = inject(UserSandbox);

  private readonly busyEffect = effect(() => {
    this.handleBusyState(this.sb.user.getState());
  });

  private readonly completeEffect = effect(() => {
    if (!this.sb.user.getCompleted()) return;
    this.sb.user.clearRequestState(RequestType.Get);
  });

  ngOnInit(): void {
    this.loadEntityMetadata();
    this.initCriteria().with('roles,permissions,image');
  }

  protected list(): void {
    this.sb.user.getAll(this.criteria.httpParams());
  }

  edit(user: User): void {
    this.sb.user.select(user);
    this.showChildComponent(this.childComponents.editUser, 'editUser');
  }

  onDelete() {
    if (this.selected.length > 0) {
      this.message.confirm('Are you sure?', 'Confirm', (confirmed) => {
        if (confirmed) {
          this.sb.user.delete(this.selected[0].id);
          this.selected = [];
        }
      });
    }
  }
}
