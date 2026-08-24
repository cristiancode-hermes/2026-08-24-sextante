import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase, conflictCode, httpMessage } from '../shared/format';
import type { Booking } from '../shared/models';

@Component({
  selector: 'app-check-in',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <h1>Check-in</h1>
        <a routerLink="/staff" class="btn btn-ghost">Volver</a>
      </div>
      <form (ngSubmit)="submit()">
        <label class="field">
          Código del ticket
          <input
            class="input"
            autocomplete="off"
            [ngModel]="code()"
            (ngModelChange)="code.set($event)"
            name="code"
          />
        </label>
        <button class="btn btn-primary" type="submit" [disabled]="!code().trim() || busy()">Escanear</button>
      </form>
      @if (error()) {
        <p class="form-error mt-4">{{ error() }}</p>
      }
      @if (already()) {
        <p class="form-error mt-4">ALREADY_CHECKED_IN — este ticket ya se escaneó.</p>
      }
      @if (booking(); as b) {
        <div class="card mt-4">
          <p><strong>{{ b.slot?.instrument?.name || 'Cúpula' }}</strong></p>
          <p class="mono">{{ b.code }} · {{ statusLabel(b.status) }}</p>
          <p>{{ formatDate(b.slot?.date) }} · {{ b.slot?.startTime }}</p>
        </div>
      }
    </div>
  `,
})
export class CheckInComponent extends FormatBase {
  private readonly api = inject(ApiService);
  protected readonly code = signal('');
  protected readonly booking = signal<Booking | null>(null);
  protected readonly error = signal('');
  protected readonly already = signal(false);
  protected readonly busy = signal(false);

  submit(): void {
    const code = this.code().trim();
    if (!code) return;
    this.busy.set(true);
    this.error.set('');
    this.already.set(false);
    this.booking.set(null);
    this.api.checkIn(code).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.booking.set(res.booking);
      },
      error: (err) => {
        this.busy.set(false);
        if (conflictCode(err) === 'ALREADY_CHECKED_IN' || err?.status === 409) {
          this.already.set(true);
          this.error.set(httpMessage(err, 'Este ticket ya se escaneó.'));
        } else {
          this.error.set(httpMessage(err, 'Código no encontrado.'));
        }
      },
    });
  }
}
