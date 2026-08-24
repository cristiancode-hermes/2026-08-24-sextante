import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase, todayISO, addDaysISO, httpMessage } from '../shared/format';
import type { Sky } from '../shared/models';

@Component({
  selector: 'app-sky-admin',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <h1>Cielo</h1>
        <a routerLink="/staff" class="btn btn-ghost">Volver</a>
      </div>
      <label class="field">
        Fecha
        <input type="date" [ngModel]="date()" (ngModelChange)="date.set($event); load()" />
      </label>
      @if (sky()) {
        <label class="field">
          Estado
          <select [ngModel]="status()" (ngModelChange)="status.set($event)">
            <option value="open">Abierto</option>
            <option value="limited">Limitado</option>
            <option value="closed">Cerrado</option>
          </select>
        </label>
        <label class="field">
          Nota
          <input [ngModel]="note()" (ngModelChange)="note.set($event)" />
        </label>
        @if (error()) {
          <p class="form-error">{{ error() }}</p>
        }
        <button type="button" class="btn btn-primary" (click)="save()">Guardar cielo</button>
      }
      <div class="mt-5">
        <button type="button" class="btn btn-ghost btn-sm" (click)="shift(-1)">Noche anterior</button>
        <button type="button" class="btn btn-ghost btn-sm" (click)="shift(1)">Noche siguiente</button>
      </div>
    </div>
  `,
})
export class SkyAdminComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly date = signal(todayISO());
  protected readonly sky = signal<Sky | null>(null);
  protected readonly status = signal('open');
  protected readonly note = signal('');
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.sky(this.date()).subscribe({
      next: (res) => {
        this.sky.set(res.sky);
        this.status.set(res.sky.status || 'open');
        this.note.set(res.sky.note || '');
      },
    });
  }

  save(): void {
    this.error.set('');
    this.api.putSky(this.date(), { status: this.status(), note: this.note() }).subscribe({
      next: (res) => this.sky.set(res.sky),
      error: (err) => this.error.set(httpMessage(err, 'No se pudo guardar.')),
    });
  }

  shift(days: number): void {
    this.date.set(addDaysISO(this.date(), days));
    this.load();
  }
}
