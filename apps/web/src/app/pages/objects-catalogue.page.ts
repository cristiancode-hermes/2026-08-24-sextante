import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { KIND_LABELS } from '../shared/models';
import type { VisibleObject } from '../shared/models';

@Component({
  selector: 'app-objects-catalogue',
  imports: [],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Objetos</h1>
          <p class="lead">Visibilidad calculada por el observatorio. No inventamos alturas en el cliente.</p>
        </div>
      </div>
      @if (loading()) {
        <p class="text-muted">Cargando catálogo celeste…</p>
      } @else if (error()) {
        <p class="form-error">{{ error() }}</p>
        <button type="button" class="btn btn-primary" (click)="load()">Reintentar</button>
      } @else if (!items().length) {
        <p class="text-muted">No hay objetos.</p>
      } @else {
        <div class="card-grid">
          @for (row of items(); track row.object.id) {
            <article class="card">
              <div class="card-body">
                <h3>{{ row.object.name }}</h3>
                <p class="text-sm">{{ kindLabel(row.object.kind) }}</p>
                <p class="text-sm">{{ row.visible ? 'Visible esta noche' : row.reason || 'No visible' }}</p>
                <p>{{ row.object.notes }}</p>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class ObjectsCatalogueComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<VisibleObject[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  readonly kindLabel = (k: string) => KIND_LABELS[k] || k;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.objects().subscribe({
      next: (res) => {
        this.items.set(res.items || []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo.');
        this.loading.set(false);
      },
    });
  }
}
