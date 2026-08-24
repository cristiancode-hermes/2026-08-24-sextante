import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase, sortNightSlots, todayISO, httpMessage } from '../shared/format';
import type { Instrument, Slot } from '../shared/models';

@Component({
  selector: 'app-slot-admin',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <h1>Franjas</h1>
        <a routerLink="/staff" class="btn btn-ghost">Volver</a>
      </div>
      <div class="filters-bar">
        <select class="input" [ngModel]="instrumentId()" (ngModelChange)="instrumentId.set($event); loadSlots()">
          <option value="">Cúpula</option>
          @for (i of instruments(); track i.id) {
            <option [value]="i.id">{{ i.name }}</option>
          }
        </select>
        <input class="input" type="date" [ngModel]="date()" (ngModelChange)="date.set($event); loadSlots()" />
        <button type="button" class="btn btn-primary" [disabled]="!instrumentId()" (click)="generate()">Generar noche</button>
      </div>
      @if (error()) {
        <p class="form-error">{{ error() }}</p>
      }
      <div class="slot-grid">
        @for (s of slots(); track s.id) {
          <button type="button" class="slot-chip" [class.busy]="s.blocked || s.taken" (click)="toggle(s)">
            <span class="mono">{{ s.startTime }}</span>
            <span>{{ s.blocked ? 'Bloqueada' : s.taken ? 'Ocupada' : 'Libre' }}</span>
          </button>
        }
      </div>
    </div>
  `,
})
export class SlotAdminComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly instruments = signal<Instrument[]>([]);
  protected readonly slots = signal<Slot[]>([]);
  protected readonly instrumentId = signal('');
  protected readonly date = signal(todayISO());
  protected readonly error = signal('');

  ngOnInit(): void {
    this.api.instruments().subscribe({
      next: (res) => this.instruments.set(res.items || []),
    });
  }

  loadSlots(): void {
    if (!this.instrumentId()) {
      this.slots.set([]);
      return;
    }
    this.api.slots(this.instrumentId(), this.date()).subscribe({
      next: (res) => this.slots.set(sortNightSlots(res.slots || [])),
      error: () => this.error.set('No se pudieron cargar las franjas.'),
    });
  }

  generate(): void {
    if (!this.instrumentId()) return;
    this.api.generateSlots(this.instrumentId(), this.date()).subscribe({
      next: () => this.loadSlots(),
      error: (err) => this.error.set(httpMessage(err, 'No se pudieron generar franjas.')),
    });
  }

  toggle(s: Slot): void {
    if (s.taken && !s.blocked) return;
    this.api.blockSlot(s.id, !s.blocked).subscribe({
      next: () => this.loadSlots(),
      error: (err) => this.error.set(httpMessage(err, 'No se pudo bloquear.')),
    });
  }
}
