import { DatetimeService, enumMeta } from '@cartesianui/platform-common';

/**
 * One-time setup code (QR / link) that connects a mobile app to one user: the generic app setup API
 * (Cartesian/AppSetup) at `/v1/users/{id}/app-setup/{app}`, with `app` the key a section registers
 * (e.g. `salesman`). The status is derived on the API from the code's instants; `tokenUrl` /
 * `qrPayload` are only ever set in the POST (create / regenerate) response, because the API stores
 * only a hash of the code.
 */
export const AppSetupStatuses = {
  NOT_SET_UP: 'not_set_up',
  ACTIVE: 'active',
  USED: 'used',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
} as const;
export type AppSetupStatus = (typeof AppSetupStatuses)[keyof typeof AppSetupStatuses];

/** The Connect App drawer's "This code" status line. */
export const AppSetupStatusMeta = enumMeta(AppSetupStatuses, {
  labels: { not_set_up: 'Not set up', active: 'Not used yet', used: 'Used', expired: 'Expired', revoked: 'Revoked' },
  colors: { not_set_up: 'secondary', active: 'warning', used: 'success', expired: 'secondary', revoked: 'danger' }
});

export interface IAppSetupSummary {
  /** The user id: the key a listing matches rows by. */
  userId: string;
  /** The app key the code is for (e.g. `salesman`). */
  app?: string;
  status: AppSetupStatus;
  issuedAt?: string | null;
  expiresAt?: string | null;
  usedAt?: string | null;
  usedDevice?: string | null;
  usedDevicePlatform?: 'android' | 'ios' | string | null;
  revokedAt?: string | null;
  /**
   * The host the app is handed on redeem (`X-Cartesian-Host`), from the request's tenant. Null when the
   * workspace has no domain (the redeem then answers 409 `workspace_unavailable`). Absent from an API
   * older than pa-section-shopifier #231.
   */
  workspaceHost?: string | null;
  /** The workspace (tenant) name; null outside a tenant. */
  tenantName?: string | null;
  /** POST response only. Never logged, never stored past the open drawer. */
  tokenUrl?: string | null;
  /** POST response only; the same value as `tokenUrl`. */
  qrPayload?: string | null;
}

/** The person the Connect App drawer issues a code for. Any user-derived record fits (a person's id IS its user id). */
export interface IConnectAppUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

/** The status as a screen shows it: an active code past its expiry reads Expired without a round trip. */
export function appSetupStatusOf(summary: IAppSetupSummary | null | undefined, now = DatetimeService.now()): AppSetupStatus {
  if (!summary) return AppSetupStatuses.NOT_SET_UP;
  if (summary.status === AppSetupStatuses.ACTIVE && summary.expiresAt && DatetimeService.fromISO(summary.expiresAt) <= now) {
    return AppSetupStatuses.EXPIRED;
  }
  return summary.status;
}
