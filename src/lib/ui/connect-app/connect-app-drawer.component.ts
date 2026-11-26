import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { convertObjectKeysToCamel } from '@cartesianui/platform-core';
import { BaseComponent, DatetimeService, DateFormat } from '@cartesianui/platform-common';
import qrcode from 'qrcode-generator';
import { AppSetupStatuses, AppSetupStatus, AppSetupStatusMeta, IAppSetupSummary, IConnectAppUser, appSetupStatusOf } from '../../models';
import { AppSetupHttpService } from '../../shared/app-setup/http.service';
import { COMMON_IMPORTS } from '../../user.imports';

/** How long the Copy button reads "Copied". */
const COPIED_MS = 1500;
/** How often the drawer re-reads the clock, so an open code turns Expired on screen. */
const CLOCK_MS = 30_000;
/** Drawn under the veil when there is no live link to show. Not a code: it only gives the veil a QR shape. */
const VEIL_PATTERN = 'app-setup';

/** Live code for the QR + link; the veil covers every other state. */
type VeilKind = 'used' | 'expired' | 'revoked' | 'hidden' | null;

/**
 * Connect App drawer: connects one user to one mobile app through the generic app setup API
 * (`/v1/users/{id}/app-setup/{app}`). Any listing drops it into its offcanvas with the app key
 * (`app`, e.g. `salesman`), the app's display label (`appLabel`, e.g. "Salesman app") and the user.
 * It shows a large QR with the brand symbol in its middle, the same link with Copy and share buttons,
 * the "This code" panel and "How it works". Header actions (via `<default-actions>`, moved into the
 * offcanvas title bar): Revoke and Regenerate, both confirmed.
 *
 * The link exists only in the POST response (the API stores a hash), so it lives in this component
 * while the drawer is open and goes when it closes. `issueOnOpen` makes the drawer issue a code as it
 * opens; without it the drawer shows the given status (e.g. a used code) and Regenerate issues the
 * next code.
 *
 * QR: `qrcode-generator` (MIT, no dependencies) at error correction H, drawn as one SVG path; the
 * symbol covers the centre, which level H recovers.
 */
@Component({
  selector: 'user-connect-app-drawer',
  templateUrl: 'connect-app-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...COMMON_IMPORTS],
  styles: [
    `
      .connect-app-qr {
        position: relative;
        width: 100%;
        max-width: 18rem;
        margin-inline: auto;
        padding: 1rem;
        border: var(--cui-border-width) solid var(--cui-border-color);
        border-radius: var(--cui-border-radius-lg);
        background: var(--cui-white);
      }
      .connect-app-qr svg {
        display: block;
        width: 100%;
        height: auto;
      }
      .connect-app-qr__modules {
        fill: var(--cui-black);
      }
      .connect-app-qr__mark {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 22%;
        aspect-ratio: 1;
        transform: translate(-50%, -50%);
        padding: 0.3rem;
        border-radius: var(--cui-border-radius);
        background: var(--cui-white);
      }
      .connect-app-qr__mark img {
        display: block;
        width: 100%;
        height: 100%;
      }
      .connect-app-qr.is-veiled svg,
      .connect-app-qr.is-veiled .connect-app-qr__mark {
        opacity: 0.12;
      }
      .connect-app-qr__veil {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1.5rem;
        text-align: center;
        color: var(--cui-body-color);
      }
      .connect-app-link {
        min-width: 0;
        border: var(--cui-border-width) solid var(--cui-border-color);
        border-radius: var(--cui-border-radius);
        background: var(--cui-tertiary-bg);
      }
      .connect-app-link__url {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .connect-app-dot {
        display: inline-block;
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .connect-app-kv > div + div {
        border-top: var(--cui-border-width) solid var(--cui-border-color-translucent);
      }
      .connect-app-step {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.375rem;
        height: 1.375rem;
        flex-shrink: 0;
        border-radius: 50%;
        font-size: 0.75rem;
        background: var(--cui-primary-bg-subtle);
        color: var(--cui-primary-text-emphasis);
      }
    `
  ],
  standalone: true
})
export class ConnectAppDrawerComponent extends BaseComponent implements OnInit {
  /** The app key in the app setup API (e.g. `salesman`). */
  readonly app = input.required<string>();
  /** The app's display name in the copy, e.g. "Salesman app". */
  readonly appLabel = input.required<string>();
  readonly user = input.required<IConnectAppUser>();
  /** The listing's last-known status for this user (no link: GET never returns one). */
  readonly summary = input<IAppSetupSummary | null>(null);
  /** Issue a code as the drawer opens. */
  readonly issueOnOpen = input<boolean>(false);
  /** Every status change, without the link, so the listing's app status cell follows. */
  readonly changed = output<IAppSetupSummary>();

  private http = inject(AppSetupHttpService);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);

  readonly statusMeta = AppSetupStatusMeta;
  readonly current = signal<IAppSetupSummary | null>(null);
  /** The link, from the last POST. Never logged; dropped with the component. */
  readonly link = signal<string | null>(null);
  readonly busy = signal<boolean>(false);
  readonly copied = signal<boolean>(false);
  readonly canShare = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';
  private readonly now = signal(DatetimeService.now());
  private copiedTimer: any;

  /** Status on screen: an active code past its expiry reads Expired without a round trip. */
  readonly status = computed<AppSetupStatus>(() => appSetupStatusOf(this.current(), this.now()));

  readonly veil = computed<VeilKind>(() => {
    switch (this.status()) {
      case AppSetupStatuses.USED:
        return 'used';
      case AppSetupStatuses.EXPIRED:
        return 'expired';
      case AppSetupStatuses.REVOKED:
        return 'revoked';
      default:
        return this.link() ? null : 'hidden';
    }
  });

  /** The QR as one SVG path in module units, plus its side (modules + a 2-module quiet zone each way). */
  readonly qr = computed(() => {
    const live = this.veil() === null ? this.link() : null;
    return this.qrPath(live ?? VEIL_PATTERN);
  });

  readonly expiryText = computed(() => {
    const s = this.current();
    switch (this.status()) {
      case AppSetupStatuses.ACTIVE: {
        if (!s?.expiresAt) return '';
        const left = Math.max(1, Math.round(DatetimeService.fromISO(s.expiresAt).diff(this.now(), 'hours').hours));
        return `Valid for ${left} ${left === 1 ? 'hour' : 'hours'} · until ${this.at(s.expiresAt)}`;
      }
      case AppSetupStatuses.USED:
        return 'Expired once used';
      case AppSetupStatuses.EXPIRED:
        return s?.expiresAt ? `Expired ${this.at(s.expiresAt)}` : 'Expired';
      case AppSetupStatuses.REVOKED:
        return s?.revokedAt ? `Revoked ${this.at(s.revokedAt)}` : 'Revoked';
      default:
        return '—';
    }
  });

  readonly deviceText = computed(() => {
    const s = this.current();
    if (!s?.usedDevice) return '';
    const platform = s.usedDevicePlatform === 'ios' ? 'iOS' : s.usedDevicePlatform === 'android' ? 'Android' : s.usedDevicePlatform;
    return platform ? `${s.usedDevice} · ${platform}` : s.usedDevice;
  });

  /**
   * The "Workspace" row: `<tenant name> · <host>`. `missing` when the API says the workspace has no
   * domain (the app cannot be set up); `null` (row hidden) while there is no summary yet, or from an
   * API that does not send the field.
   */
  readonly workspace = computed<{ kind: 'set'; text: string } | { kind: 'missing' } | null>(() => {
    const s = this.current();
    if (!s || s.workspaceHost === undefined) return null;
    if (!s.workspaceHost) return { kind: 'missing' };
    return { kind: 'set', text: [s.tenantName, s.workspaceHost].filter(Boolean).join(' · ') };
  });

  ngOnInit(): void {
    this.current.set(this.summary());
    const clock = setInterval(() => this.now.set(DatetimeService.now()), CLOCK_MS);
    this.destroyRef.onDestroy(() => {
      clearInterval(clock);
      clearTimeout(this.copiedTimer);
    });
    if (this.issueOnOpen()) this.issue();
  }

  at(iso: string | null | undefined): string {
    return iso ? (DatetimeService.fromISO(iso, DateFormat.DATETIME_MED) as string) : '';
  }

  /** Regenerate: confirmed, and a live code is replaced (the API revokes it first). */
  confirmRegenerate(): void {
    const replacing = this.status() === AppSetupStatuses.ACTIVE;
    const text = replacing
      ? 'This replaces the current code. The old code stops working.'
      : `Generate a new setup code for ${this.user().name || 'this user'}?`;
    this.message.confirm(text, 'Regenerate code', (confirmed: boolean) => {
      if (confirmed) this.issue();
    });
  }

  confirmRevoke(): void {
    this.message.confirm('The code stops working at once. A phone already set up stays signed in.', 'Revoke code', (confirmed: boolean) => {
      if (confirmed) this.revoke();
    });
  }

  issue(): void {
    this.busy.set(true);
    this.http.issue(this.user().id, this.app()).subscribe({
      next: (res: any) => {
        const summary = convertObjectKeysToCamel(res?.data ?? {}) as IAppSetupSummary;
        this.link.set(summary.qrPayload ?? summary.tokenUrl ?? null);
        this.apply(summary);
        this.busy.set(false);
      },
      error: (err: any) => {
        this.busy.set(false);
        this.notify.error(err?.error?.message ?? 'Could not create a setup code', 'Error');
      }
    });
  }

  revoke(): void {
    this.busy.set(true);
    this.http.revoke(this.user().id, this.app()).subscribe({
      next: (res: any) => {
        this.link.set(null);
        this.apply(convertObjectKeysToCamel(res?.data ?? {}) as IAppSetupSummary);
        this.busy.set(false);
        this.notify.success('Setup code revoked', 'Success');
      },
      error: (err: any) => {
        this.busy.set(false);
        this.notify.error(err?.error?.message ?? 'Could not revoke the code', 'Error');
      }
    });
  }

  /** Keep the summary on screen; hand the listing a copy without the link. */
  private apply(summary: IAppSetupSummary): void {
    const { tokenUrl, qrPayload, ...withoutLink } = summary;
    this.current.set(withoutLink);
    this.now.set(DatetimeService.now());
    this.changed.emit(withoutLink);
  }

  // ── Send the link ────────────────────────────────────────────────────────────

  private shareText(link: string): string {
    return `Set up the ${this.appLabel()}: open this link on your phone (one-time code). ${link}`;
  }

  whatsappHref(link: string): string {
    return `https://wa.me/?text=${encodeURIComponent(this.shareText(link))}`;
  }

  smsHref(link: string): string {
    return `sms:?&body=${encodeURIComponent(this.shareText(link))}`;
  }

  mailHref(link: string): string {
    const to = this.user().email ?? '';
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(`Set up the ${this.appLabel()}`)}&body=${encodeURIComponent(this.shareText(link))}`;
  }

  async share(link: string): Promise<void> {
    try {
      await (navigator as any).share({ title: `Set up the ${this.appLabel()}`, text: this.shareText(link), url: link });
    } catch {
      // Cancelled by the user, or refused: nothing to do.
    }
  }

  /**
   * Copy, the doc-number way: the Clipboard API in a secure context, else (plain-http dev hosts) a
   * hidden textarea plus `execCommand('copy')`.
   */
  async copy(link: string): Promise<void> {
    if (!(await this.write(link))) {
      this.notify.error('Could not copy the link', 'Error');
      return;
    }
    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), COPIED_MS);
  }

  private async write(text: string): Promise<boolean> {
    const view = this.document.defaultView;
    const clipboard = view?.navigator?.clipboard;
    if (clipboard && view?.isSecureContext) {
      try {
        await clipboard.writeText(text);
        return true;
      } catch {
        // Refused (permissions, focus): try the legacy path below.
      }
    }
    const doc = this.document;
    const previous = doc.activeElement as HTMLElement | null;
    const area = doc.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.setAttribute('aria-hidden', 'true');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '-9999px';
    area.style.opacity = '0';
    doc.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = doc.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    previous?.focus?.();
    return ok;
  }

  private qrPath(text: string): { d: string; size: number } {
    const code = qrcode(0, 'H');
    code.addData(text);
    code.make();
    const count = code.getModuleCount();
    const quiet = 2;
    let d = '';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (code.isDark(row, col)) d += `M${col + quiet} ${row + quiet}h1v1h-1z`;
      }
    }
    return { d, size: count + quiet * 2 };
  }
}
