import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase } from '../shared/format';
import type { Booking } from '../shared/models';

@Component({
  selector: 'app-confirmation',
  imports: [RouterLink],
  template: `
    <div class="container page confirm-wrap">
      <h1>Noche confirmada</h1>
      @if (loading()) {
        <p class="text-muted">Cargando ticket…</p>
      } @else if (error()) {
        <p class="form-error">{{ error() }}</p>
      } @else if (booking(); as b) {
        <p class="mono ticket-code">{{ b.code }}</p>
        @if (qr()) {
          <div class="qr-box" [innerHTML]="qr()"></div>
        }
        <p class="total">{{ eur(totalCents()) }}</p>
        <a class="btn btn-primary" [routerLink]="['/mis-noches', b.id]">Ver detalle</a>
      }
    </div>
  `,
})
export class ConfirmationComponent extends FormatBase implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly booking = signal<Booking | null>(null);
  protected readonly totalCents = signal(0);
  protected readonly qr = signal<SafeHtml | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.api.booking(this.id()).subscribe({
      next: (res) => {
        const row = res.booking;
        this.booking.set(row);
        this.totalCents.set(res.totalCents ?? row.totalCents);
        const svg = res.qrSvg || null;
        if (svg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(svg));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No encontramos esa reserva.');
        this.loading.set(false);
      },
    });
  }
}
