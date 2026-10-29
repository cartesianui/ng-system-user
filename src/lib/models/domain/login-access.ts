declare const cartesian: any;

/** The person types that carry their own `user_management.login_access_<type>` setting. */
export type LoginAccessType = 'user' | 'employee' | 'doctor' | 'agent' | 'artist' | 'customer' | 'vendor' | 'patient';

/**
 * Whether new people of `type` get a login in this tenant: `user_management.login_access_<type>`, read from the
 * public configuration bundle that app init camelCases and merges into the `cartesian` global
 * (`cartesian.userManagement.loginAccessCustomer`, …). Unset means the server default, `true`. With it off the
 * server creates a record and discards any posted password.
 */
export function tenantLoginAccess(type: LoginAccessType): boolean {
  const key = 'loginAccess' + type.charAt(0).toUpperCase() + type.slice(1);
  const value = typeof cartesian !== 'undefined' ? cartesian?.userManagement?.[key] : undefined;
  return !(value === false || value === 'false' || value === 0 || value === '0');
}
