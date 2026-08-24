import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase } from '../shared/format';
import type { Instrument, Sky } from '../shared/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <img src="/assets/hero.jpg" alt="Cielo nocturno sobre el observatorio" />
      <div class="hero-copy container">
        <p class="eyebrow">Observatorio municipal</p>
        <h1>Una cúpula. Una noche. Un grupo.</h1>
        <p class="lead">Reserva un telescopio exclusivo, elige objetos visibles y entra con ticket QR.</p>
        <a routerLink="/cupulas" class="btn btn-primary">Reservar noche</a>
      </div>
    </section>
    <div class="container page">
      @if (sky()) {
        <div class="sky-banner" [attr.data-status]="sky()!.status">
          <strong>{{ skyLabel(sky()!.status) }}</strong>
          <span>{{ sky()!.note || 'Cielo de esta noche' }}</span>
        </div>
      }
      <div class="page-header">
        <div>
          <h2>Cúpulas destacadas</h2>
          <p class="text-muted">{{ freeSlotsToday() }} franjas libres hoy</p>
        </div>
        <a routerLink="/cupulas" class="btn btn-secondary">Ver catálogo</a>
      </div>
      @if (loading()) {
        <p class="text-muted">Cargando cúpulas…</p>
      } @else if (error()) {
        <p class="form-error">{{ error() }}</p>
      } @else if (!items().length) {
        <p class="text-muted">No hay cúpulas activas.</p>
      } @else {
        <div class="card-grid">
          @for (inst of items(); track inst.id) {
            <a class="card instrument-card" [routerLink]="['/cupulas', inst.id]">
              <img [src]="inst.photoUrl" [alt]="inst.name" />
              <div class="card-body">
                <h3>{{ inst.name }}</h3>
                <p class="text-sm">{{ typeLabel(inst.type) }} · {{ inst.apertureMm }} mm</p>
                <p class="mono">{{ eur(inst.priceCents) }} / persona</p>
                <p class="text-sm">{{ inst.freeSlotsToday ?? 0 }} franjas libres hoy</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class HomePageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<Instrument[]>([]);
  protected readonly freeSlotsToday = signal(0);
  protected readonly sky = signal<Sky | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.api.sky().subscribe({
      next: (res) => this.sky.set(res.sky),
    });
    this.api.featured().subscribe({
      next: (res) => {
        this.items.set(res.items || []);
        this.freeSlotsToday.set(res.freeSlotsToday ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el cielo de esta noche.');
        this.loading.set(false);
      },
    });
  }
}
