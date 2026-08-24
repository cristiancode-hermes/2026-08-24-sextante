import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase } from '../shared/format';
import type { Instrument } from '../shared/models';

@Component({
  selector: 'app-instruments-catalogue',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Cúpulas</h1>
          <p class="lead">{{ freeSlotsToday() }} franjas libres hoy</p>
        </div>
      </div>
      <div class="filters-bar">
        <input
          class="input"
          type="search"
          placeholder="Buscar cúpula"
          [ngModel]="query()"
          (ngModelChange)="query.set($event); load()"
        />
        <select class="input" [ngModel]="type()" (ngModelChange)="type.set($event); load()">
          <option value="">Todos los tipos</option>
          <option value="planets">Planetas</option>
          <option value="deep">Cielo profundo</option>
          <option value="solar">Solar</option>
        </select>
      </div>
      @if (loading()) {
        <p class="text-muted">Cargando…</p>
      } @else if (error()) {
        <p class="form-error">{{ error() }}</p>
        <button type="button" class="btn btn-primary" (click)="load()">Reintentar</button>
      } @else if (!items().length) {
        <p class="text-muted">No hay cúpulas que coincidan.</p>
      } @else {
        <div class="card-grid">
          @for (inst of items(); track inst.id) {
            <a class="card instrument-card" [routerLink]="['/cupulas', inst.id]">
              <img [src]="inst.photoUrl" [alt]="inst.name" />
              <div class="card-body">
                <h3>{{ inst.name }}</h3>
                <p class="text-sm">{{ typeLabel(inst.type) }} · {{ inst.apertureMm }} mm · {{ inst.mount }}</p>
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
export class InstrumentsCatalogueComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<Instrument[]>([]);
  protected readonly freeSlotsToday = signal(0);
  protected readonly query = signal('');
  protected readonly type = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.instruments({ q: this.query() || undefined, type: this.type() || undefined }).subscribe({
      next: (res) => {
        this.items.set(res.items || []);
        this.freeSlotsToday.set(res.freeSlotsToday ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo.');
        this.loading.set(false);
      },
    });
  }
}
