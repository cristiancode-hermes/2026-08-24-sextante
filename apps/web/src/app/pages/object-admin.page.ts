import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { KIND_LABELS } from '../shared/models';
import type { VisibleObject } from '../shared/models';

@Component({
  selector: 'app-object-admin',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <h1>Objetos</h1>
        <a routerLink="/staff" class="btn btn-ghost">Volver</a>
      </div>
      <ul class="admin-list">
        @for (row of items(); track row.object.id) {
          <li class="card">
            <strong>{{ row.object.name }}</strong>
            <span class="text-sm">{{ kindLabel(row.object.kind) }}</span>
            <label class="check-row">
              <input
                type="checkbox"
                [checked]="row.object.active"
                (change)="toggle(row, $any($event.target).checked)"
              />
              Activo
            </label>
            <label class="field">
              Notas
              <input [ngModel]="row.object.notes" (ngModelChange)="saveNotes(row, $event)" />
            </label>
          </li>
        }
      </ul>
    </div>
  `,
})
export class ObjectAdminComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<VisibleObject[]>([]);
  readonly kindLabel = (k: string) => KIND_LABELS[k] || k;

  ngOnInit(): void {
    this.api.objects().subscribe({
      next: (res) => this.items.set(res.items || []),
    });
  }

  toggle(row: VisibleObject, active: boolean): void {
    this.api.updateObject(row.object.id, { active }).subscribe({
      next: (res) => this.patch(res.object.id, res.object),
    });
  }

  saveNotes(row: VisibleObject, notes: string): void {
    this.api.updateObject(row.object.id, { notes }).subscribe({
      next: (res) => this.patch(res.object.id, res.object),
    });
  }

  private patch(id: string, object: VisibleObject['object']): void {
    this.items.update((list) => list.map((r) => (r.object.id === id ? { ...r, object } : r)));
  }
}
