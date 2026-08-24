import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { FormatBase, sortNightSlots, todayISO } from '../shared/format';
import type { Instrument, Review, Sky, Slot } from '../shared/models';

@Component({
  selector: 'app-instrument-detail',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      @if (loading()) {
        <p class="text-muted">Cargando cúpula…</p>
      } @else if (error()) {
        <p class="form-error">{{ error() }}</p>
        <button type="button" class="btn btn-primary" (click)="load()">Reintentar</button>
      } @else if (!instrument()) {
        <p class="text-muted">Cúpula no encontrada.</p>
        <a routerLink="/cupulas" class="btn btn-secondary">Volver al catálogo</a>
      } @else {
        <article class="detail-layout">
          <img class="detail-photo" [src]="instrument()!.photoUrl" [alt]="instrument()!.name" />
          <div>
            <p class="eyebrow">{{ typeLabel(instrument()!.type) }}</p>
            <h1>{{ instrument()!.name }}</h1>
            <p>{{ instrument()!.description }}</p>
            <p class="text-sm">{{ instrument()!.apertureMm }} mm · {{ instrument()!.mount }} · máx. {{ instrument()!.maxParty }} personas</p>
            <p class="mono">{{ eur(instrument()!.priceCents) }} / persona</p>
            <p class="text-sm">{{ ratingCount() }} reseñas · media {{ ratingAvg() }}</p>
          </div>
        </article>
        @if (sky()) {
          <div class="sky-banner" [attr.data-status]="sky()!.status">
            <strong>{{ skyLabel(sky()!.status) }}</strong>
            <span>{{ sky()!.note || 'Cielo de la noche seleccionada' }}</span>
          </div>
        }
        <div class="between mt-5">
          <h2>Franjas</h2>
          <label class="field compact">
            Fecha
            <input type="date" [ngModel]="date()" (ngModelChange)="date.set($event); loadSlots()" />
          </label>
        </div>
        @if (slotsLoading()) {
          <p class="text-muted">Cargando franjas…</p>
        } @else if (!slots().length) {
          <p class="text-muted">No hay franjas para esta noche.</p>
        } @else {
          <div class="slot-grid">
            @for (s of slots(); track s.id) {
              <button
                type="button"
                class="slot-chip"
                [class.busy]="isBusy(s)"
                [disabled]="isBusy(s)"
                (click)="pick(s)"
              >
                <span class="mono">{{ s.startTime }}</span>
                <span>{{ isBusy(s) ? 'Ocupada' : 'Libre' }}</span>
              </button>
            }
          </div>
        }
        <h2 class="mt-5">Reseñas</h2>
        @if (!reviews().length) {
          <p class="text-muted">Aún no hay reseñas.</p>
        } @else {
          <ul class="review-list">
            @for (r of reviews(); track r.id) {
              <li>
                <strong>{{ r.rating }}/5</strong>
                <span>{{ r.comment || 'Sin comentario' }}</span>
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
})
export class InstrumentDetailComponent extends FormatBase implements OnInit {
  readonly id = input.required<string>();
  public auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly instrument = signal<Instrument | null>(null);
  protected readonly ratingAvg = signal(0);
  protected readonly ratingCount = signal(0);
  protected readonly slots = signal<Slot[]>([]);
  protected readonly sky = signal<Sky | null>(null);
  protected readonly reviews = signal<Review[]>([]);
  protected readonly date = signal(todayISO());
  protected readonly loading = signal(true);
  protected readonly slotsLoading = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.instrument(this.id()).subscribe({
      next: (res) => {
        this.instrument.set(res.instrument);
        this.ratingAvg.set(res.ratingAvg ?? 0);
        this.ratingCount.set(res.ratingCount ?? 0);
        this.loading.set(false);
        this.loadSlots();
      },
      error: () => {
        this.error.set('No se pudo cargar la cúpula.');
        this.loading.set(false);
      },
    });
    this.api.reviews(this.id()).subscribe({
      next: (res) => this.reviews.set(res.items || []),
    });
  }

  loadSlots(): void {
    this.slotsLoading.set(true);
    this.api.slots(this.id(), this.date()).subscribe({
      next: (res) => {
        this.slots.set(sortNightSlots(res.slots || []));
        this.sky.set(res.sky || null);
        this.slotsLoading.set(false);
      },
      error: () => {
        this.slots.set([]);
        this.slotsLoading.set(false);
      },
    });
  }

  isBusy(s: Slot): boolean {
    return !!s.taken || s.blocked || s.status === 'busy' || s.status === 'blocked';
  }

  pick(s: Slot): void {
    if (this.isBusy(s)) return;
    if (!this.auth.getToken()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: `/checkout/${s.id}` } });
      return;
    }
    void this.router.navigate(['/checkout', s.id]);
  }
}
