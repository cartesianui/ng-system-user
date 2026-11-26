import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService, GET, POST, DELETE, Path, Criteria, DefaultHeaders } from '@cartesianui/platform-core';

/**
 * The generic app setup API (Cartesian/AppSetup): one-time codes that connect a mobile app to a user,
 * for any app a section registers (`salesman`, ...). In `providedIn: 'root'` so a listing in any
 * section can read the bulk status and drop in the Connect App drawer without providing anything.
 */
@Injectable({ providedIn: 'root' })
@DefaultHeaders({
  Accept: 'application/json',
  'Content-Type': 'application/json'
})
export class AppSetupHttpService extends HttpService {
  /**
   * Setup status for many users at once (a listing's app column), one entry per id in the order sent.
   * Pass `new HttpParams({ fromObject: { app, 'user_ids[]': ids } })`: the API reads an array (max 200),
   * and `@Query` would JSON-encode one.
   */
  @GET('/app-setup')
  public getStatuses(@Criteria params: HttpParams): Observable<any> {
    return null;
  }

  @GET('/users/{id}/app-setup/{app}')
  public getStatus(@Path('id') id: string, @Path('app') app: string): Observable<any> {
    return null;
  }

  /** Issue a setup code; revokes any open one first (= regenerate). The only response that carries the link. */
  @POST('/users/{id}/app-setup/{app}')
  public issue(@Path('id') id: string, @Path('app') app: string): Observable<any> {
    return null;
  }

  /** Revoke the open code. Idempotent; a used code stays used. */
  @DELETE('/users/{id}/app-setup/{app}')
  public revoke(@Path('id') id: string, @Path('app') app: string): Observable<any> {
    return null;
  }
}
