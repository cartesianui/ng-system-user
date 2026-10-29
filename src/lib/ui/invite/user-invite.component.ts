import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotifyService } from '@cartesianui/platform-core';
import { UserHttpService } from '../../shared';

/**
 * "Invite / resend set-password link" for any user-derived record (customer, vendor, employee, patient, doctor,
 * agent, artist): `POST /v1/users/{id}/invite` with `{}`, through the Users screen's own `UserHttpService`.
 * A person's id IS its user id (each person model extends the User model).
 *
 * Rendered only when the person has an email. It does not look at the tenant's login setting: inviting is a
 * deliberate admin action that gives this one person a login. A 422 (no email, a username clash, an AI or system
 * user) is shown by the global error toast with the server's message.
 */
@Component({
  selector: 'user-invite-link',
  template: `
    @if (email()) {
      <div class="mt-2">
        <button type="button" class="btn btn-outline-primary btn-sm" [disabled]="inviting()" (click)="invite()">
          <i class="fa-solid fa-envelope me-1"></i>Invite / resend set-password link
        </button>
        <small class="form-text text-muted d-block">Emails {{ email() }} a link to set a password. Any earlier link stops working.</small>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  providers: [UserHttpService],
  standalone: true
})
export class UserInviteComponent {
  private http = inject(UserHttpService);
  private notify = inject(NotifyService);

  /** The person's (user) id. */
  readonly userId = input<string | undefined>(undefined);
  readonly email = input<string | undefined>(undefined);

  /** Emits after a successful invite, so the host can re-fetch the person. */
  readonly invited = output<void>();

  readonly inviting = signal(false);

  invite(): void {
    const id = this.userId();
    const email = this.email();
    if (!id || !email || this.inviting()) return;
    this.inviting.set(true);
    this.http.invite(id, {}).subscribe({
      next: () => {
        this.inviting.set(false);
        this.notify.success(`A set-password link was sent to ${email}.`, 'Link sent');
        this.invited.emit();
      },
      error: () => this.inviting.set(false)
    });
  }
}
