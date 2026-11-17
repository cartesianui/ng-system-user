/**
 * One logged-in app (Admin, POS, Care) as `GET /users/{id}/apps` returns it: every app, each with
 * `allowed` for that user. A user with no limit has every app allowed (owner, 2026-11-17).
 */
export interface UserApp {
  id: string;
  key: string;
  name: string;
  allowed: boolean;
}
