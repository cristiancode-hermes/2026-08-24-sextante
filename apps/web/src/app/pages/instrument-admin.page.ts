import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase, httpMessage } from '../shared/format';
import type { Instrument } from '../shared/models';

@Component({
  selector: 'app-instrument-admin',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <h1>Cúpulas</h1>
        <a routerLink="/staff" class="btn btn-ghost">Volver</a>
      </div>
      @if (error()) {
        <p class="form-error">{{ error() }}</p>
      }
      <ul class="admin-list">
        @for (i of items(); track i.id) {
          <li class="card">
            <strong>{{ i.name }}</strong>
            <span class="mono">{{ eur(i.priceCents) }}</span>
            <label class="check-row">
              <input type="checkbox" [checked]="i.active" (change)="toggle(i, $any($event.target).checked)" />
              Activa
            </label>
            <label class="field compact">
              Precio (céntimos)
              <input type="number" [ngModel]="i.priceCents" (ngModelChange)="savePrice(i, +$event)" />
            </label>
          </li>
        }
      </ul>
    </div>
  `,
})
export class InstrumentAdminComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<Instrument[]>([]);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.api.instruments().subscribe({
      next: (res) => this.items.set(res.items || []),
      error: () => this.error.set('No se pudieron cargar las cúpulas.'),
    });
  }

  toggle(i: Instrument, active: boolean): void {
    this.api.updateInstrument(i.id, { active }).subscribe({
      next: (res) => this.replace(res.instrument),
      error: (err) => this.error.set(httpMessage(err, 'No se pudo actualizar.')),
    });
  }

  savePrice(i: Instrument, priceCents: number): void {
    if (!Number.isFinite(priceCents)) return;
    this.api.updateInstrument(i.id, { priceCents }).subscribe({
      next: (res) => this.replace(res.instrument),
    });
  }

  private replace(updated: Instrument): void {
    this.items.update((list) => list.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
  }
}
