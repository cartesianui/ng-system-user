import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IHttpService, HttpService, POST, GET, Body, Criteria, DefaultHeaders, RequestCriteriaOuput, Path, Query, DELETE, PATCH, PUT, ICartesianResponse } from '@cartesianui/platform-core';
import { User, UserPermission, UserRole } from '../../models';

export type IUserHttpServiceExtension = {
  updateUserCredentials: (id: string, body: { currentPassword: string; newPassword: string }) => Observable<ICartesianResponse>;
  profile: (token: string) => Observable<ICartesianResponse>;
  assignRole: (id: string, body: UserRole) => Observable<ICartesianResponse>;
  syncRole: (id: string, body: UserRole) => Observable<ICartesianResponse>;
  revokeRole: (id: string, body: UserRole) => Observable<ICartesianResponse>;
  attachPermissions: (id: string, body: UserPermission) => Observable<ICartesianResponse>;
  revokePermissions: (id: string, body: UserPermission) => Observable<ICartesianResponse>;
  vendors: (criteria: RequestCriteriaOuput) => Observable<ICartesianResponse>;
  customers: (criteria: RequestCriteriaOuput) => Observable<ICartesianResponse>;
};

@Injectable()
@DefaultHeaders({
  Accept: 'application/json',
  'Content-Type': 'application/json'
})
export class UserHttpService extends HttpService implements IHttpService<User, IUserHttpServiceExtension> {

  @GET('/users')
  public getAll(@Criteria criteria: RequestCriteriaOuput): Observable<any> {
    return null;
  }

  @GET('/users/{id}')
  public getById(@Path('id') id: string, @Query('include') includes?: string): Observable<any> {
    return null;
  }

  @POST('/register')
  public create(@Body body: User): Observable<any> {
    return null;
  }

  @PATCH('/users/{id}?include=roles,permissions')
  public update(@Path('id') id: string, @Body body: Partial<User>): Observable<any> {
    return null;
  }

  @DELETE('/users/{id}')
  public delete(@Path('id') id: string): Observable<any> {
    return null;
  }

  @PATCH('/users/{id}/password')
  public updateUserCredentials(@Path('id') id: string, @Body body: { currentPassword: string; newPassword: string }): Observable<any> {
    return null;
  }

  @GET('/user/profile')
  public profile(@Body token: string): Observable<any> {
    return null;
  }

  @GET('/cartesian/users?roles[]=vendor')
  public vendors(@Criteria criteria: RequestCriteriaOuput): Observable<any> {
    return null;
  }

  @GET('/cartesian/users?roles[]=customer')
  public customers(@Criteria criteria: RequestCriteriaOuput): Observable<any> {
    return null;
  }

  @PATCH('/users/{id}/roles?include=roles,permissions')
  public assignRole(@Path('id') id: string, @Body body: UserRole): Observable<any> {
    return null;
  }

  @PUT('/users/{id}/roles?include=roles,permissions')
  public syncRole(@Path('id') id: string, @Body body: UserRole): Observable<any> {
    return null;
  }

  @DELETE('/users/{id}/roles?include=roles,permissions')
  public revokeRole(@Path('id') id: string, @Body body: UserRole): Observable<any> {
    return null;
  }

  @POST('/users/{id}/permissions?include=roles,permissions')
  public attachPermissions(@Path('id') id: string, @Body body: UserPermission): Observable<any> {
    return null;
  }

  @DELETE('/users/{id}/permissions?include=roles,permissions')
  public revokePermissions(@Path('id') id: string, @Body body: UserPermission): Observable<any> {
    return null;
  }
}
