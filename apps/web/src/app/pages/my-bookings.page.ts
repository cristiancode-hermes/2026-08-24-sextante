import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase } from '../shared/format';
import type { Booking } from '../shared/models';

@Component({
  selector: 'app-my-bookings',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <h1>Mis noches</h1>
      @if (loading()) {
        <p class="text-muted">Cargando reservas…</p>
      } @else if (error()) {
        <p class="form-error">{{ error() }}</p>
        <button type="button" class="btn btn-primary" (click)="load()">Reintentar</button>
      } @else if (!items().length) {
        <p class="text-muted">Aún no tienes noches reservadas.</p>
        <a routerLink="/cupulas" class="btn btn-primary">Reservar noche</a>
      } @else {
        <ul class="booking-list">
          @for (b of items(); track b.id) {
            <li class="card">
              <a [routerLink]="['/mis-noches', b.id]">
                <strong>{{ b.instrument?.name || b.slot?.instrument?.name || 'Cúpula' }}</strong>
                <span class="text-sm">{{ formatDate(b.slot?.date) }} · {{ b.slot?.startTime }}</span>
                <span [class]="statusBadgeClass(b.status)">{{ statusLabel(b.status) }}</span>
                <span class="mono">{{ eur(b.totalCents) }}</span>
              </a>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class MyBookingsComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<Booking[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.bookings().subscribe({
      next: (res) => {
        this.items.set(res.items || []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las reservas.');
        this.loading.set(false);
      },
    });
  }
}
