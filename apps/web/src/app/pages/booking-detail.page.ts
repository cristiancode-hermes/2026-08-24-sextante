import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase, httpMessage } from '../shared/format';
import type { Booking, BookingLine, QueueEntry } from '../shared/models';

@Component({
  selector: 'app-booking-detail',
  imports: [RouterLink],
  template: `
    <div class="container page">
      @if (loading()) {
        <p class="text-muted">Cargando reserva…</p>
      } @else if (error()) {
        <p class="form-error">{{ error() }}</p>
      } @else if (booking(); as b) {
        <div class="page-header">
          <div>
            <h1>{{ b.slot?.instrument?.name || 'Noche' }}</h1>
            <p class="lead">{{ formatDate(b.slot?.date) }} · {{ b.slot?.startTime }} · {{ b.code }}</p>
          </div>
          <span [class]="statusBadgeClass(b.status)">{{ statusLabel(b.status) }}</span>
        </div>
        @if (qr()) {
          <div class="qr-box" [innerHTML]="qr()"></div>
        }
        <ul class="lines-list">
          @for (l of lines(); track l.id) {
            <li>
              <span>{{ l.label }} × {{ l.quantity }}</span>
              <strong class="mono">{{ eur(l.amountCents) }}</strong>
            </li>
          }
        </ul>
        <p class="total">{{ eur(totalCents()) }}</p>
        @if (queue().length) {
          <h2>Cola de objetos</h2>
          <ol class="queue-list">
            @for (q of queue(); track q.objectId; let i = $index) {
              <li [class.now]="q.nowViewing">
                <span>{{ q.object?.name || q.objectId }}</span>
                @if (b.status === 'checked_in') {
                  <span class="queue-actions">
                    <button type="button" class="btn btn-ghost btn-sm" [disabled]="i === 0" (click)="move(i, -1)">↑</button>
                    <button type="button" class="btn btn-ghost btn-sm" [disabled]="i === queue().length - 1" (click)="move(i, 1)">↓</button>
                  </span>
                }
              </li>
            }
          </ol>
          @if (b.status === 'checked_in') {
            <button type="button" class="btn btn-secondary" (click)="advance()">Siguiente objeto</button>
          }
        }
        @if (b.status === 'pending' || b.status === 'confirmed') {
          <button type="button" class="btn btn-danger mt-4" (click)="cancel()">Cancelar</button>
        }
        @if (b.status === 'completed') {
          <a class="btn btn-secondary mt-4" [routerLink]="['/cupulas', b.slot?.instrumentId || b.slot?.instrument?.id, 'resena']">Escribir reseña</a>
        }
      }
    </div>
  `,
})
export class BookingDetailComponent extends FormatBase implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly booking = signal<Booking | null>(null);
  protected readonly lines = signal<BookingLine[]>([]);
  protected readonly queue = signal<QueueEntry[]>([]);
  protected readonly totalCents = signal(0);
  protected readonly qr = signal<SafeHtml | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.booking(this.id()).subscribe({
      next: (res) => {
        this.booking.set(res.booking);
        this.lines.set(res.lines || []);
        this.queue.set(res.queue || []);
        this.totalCents.set(res.totalCents ?? res.booking.totalCents);
        if (res.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(res.qrSvg));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la reserva.');
        this.loading.set(false);
      },
    });
  }

  move(index: number, dir: number): void {
    const list = [...this.queue()];
    const next = index + dir;
    if (next < 0 || next >= list.length) return;
    const tmp = list[index];
    list[index] = list[next];
    list[next] = tmp;
    this.queue.set(list);
    this.api.reorderQueue(this.id(), list.map((q) => q.objectId)).subscribe({
      next: (res) => this.queue.set(res.entries || list),
      error: (err) => this.error.set(httpMessage(err, 'No se pudo reordenar.')),
    });
  }

  advance(): void {
    this.api.advanceQueue(this.id()).subscribe({
      next: (res) => this.queue.set(res.entries || []),
    });
  }

  cancel(): void {
    this.api.cancel(this.id()).subscribe({
      next: (res) => {
        this.booking.set(res.booking);
        this.totalCents.set(res.totalCents ?? res.booking.totalCents);
      },
      error: (err) => this.error.set(httpMessage(err, 'No se pudo cancelar.')),
    });
  }
}
