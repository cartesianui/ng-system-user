import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, switchMap, map, catchError } from 'rxjs';
import { EntityEffect } from '@cartesianui/platform-common';
import { ICartesianResponse } from '@cartesianui/platform-core';
import { UserActions } from './actions';
import { User } from '../../models';
import { UserHttpService, IUserHttpServiceExtension } from '../../shared/user/http.service';

@Injectable()
export class UserEffects extends EntityEffect<User, IUserHttpServiceExtension> {
  constructor(actions$: Actions, httpService: UserHttpService) {
    super(httpService, UserActions);
  }

  updateUserCredentials$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.updateUserCredentials),
      map(({ user }) => user),
      switchMap(({ id, changes }) =>
        this.httpService.updateUserCredentials(id as string, changes).pipe(
          map(({ data }: ICartesianResponse) => UserActions.updateSuccess({ entity: data })),
          catchError(({ errors, message }: ICartesianResponse) => of(UserActions.updateFailure({ errors, message })))
        )
      )
    )
  );

  attachRole$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.attachRoles),
      switchMap(({ id, form }) =>
        this.httpService.assignRole(id, form).pipe(
          map(({ data }: ICartesianResponse) => UserActions.updateSuccess({ entity: data })),
          catchError(({ errors, message }: ICartesianResponse) => of(UserActions.updateFailure({ errors, message })))
        )
      )
    )
  );

  detachRole$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.detachRoles),
      switchMap(({ id, form }) =>
        this.httpService.revokeRole(id, form).pipe(
          map(({ data }: ICartesianResponse) => UserActions.updateSuccess({ entity: data })),
          catchError(({ errors, message }: ICartesianResponse) => of(UserActions.updateFailure({ errors, message })))
        )
      )
    )
  );

  attachPermission$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.attachPermissions),
      switchMap(({ id, form }) =>
        this.httpService.attachPermissions(id, form).pipe(
          map(({ data }: ICartesianResponse) => UserActions.updateSuccess({ entity: data })),
          catchError(({ errors, message }: ICartesianResponse) => of(UserActions.updateFailure({ errors, message })))
        )
      )
    )
  );

  detachPermission$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.detachPermissions),
      switchMap(({ id, form }) =>
        this.httpService.revokePermissions(id, form).pipe(
          map(({ data }: ICartesianResponse) => UserActions.updateSuccess({ entity: data })),
          catchError(({ errors, message }: ICartesianResponse) => of(UserActions.updateFailure({ errors, message })))
        )
      )
    )
  );
}
