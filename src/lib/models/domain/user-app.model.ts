/**
 * One logged-in app (Admin, POS, Care) as `GET /users/{id}/apps` returns it: every app, each with
 * `allowed` when the user has been granted it. Explicit grant only (owner, 2026-11-17): no rows,
 * nothing allowed.
 */
export interface UserApp {
  id: string;
  key: string;
  name: string;
  allowed: boolean;
}
