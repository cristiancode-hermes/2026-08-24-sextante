import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase, httpMessage } from '../shared/format';
import type { BookingDetailResponse, Instrument, MenuItem, Slot, VisibleObject } from '../shared/models';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Checkout</h1>
          <p class="lead">
            @if (instrument() && slot()) {
              {{ instrument()!.name }} · {{ formatDate(slot()!.date) }} · {{ slot()!.startTime }}
            } @else {
              Retén la cúpula 15 minutos
            }
          </p>
        </div>
        @if (booking() && remainSec() > 0) {
          <div class="hold-timer">
            <span class="text-sm">Hold</span>
            <strong class="mono">{{ mmss(remainSec()) }}</strong>
          </div>
        }
      </div>
      @if (error()) {
        <div class="error-banner mb-4">{{ error() }}</div>
      }
      @if (loading()) {
        <p class="text-muted">Cargando franja…</p>
      } @else if (!slot() || !instrument()) {
        <p class="text-muted">Franja no encontrada.</p>
        <a routerLink="/cupulas" class="btn btn-secondary">Volver</a>
      } @else {
        <div class="checkout-grid">
          <section class="card">
            <h2>Grupo</h2>
            <label class="field">
              Personas (1–{{ maxParty() }})
              <input
                type="number"
                min="1"
                [attr.max]="maxParty()"
                [ngModel]="partySize()"
                (ngModelChange)="partySize.set(clampParty(+$event))"
              />
            </label>
            <h3 class="mt-4">Objetos visibles</h3>
            <p class="text-sm">Solo aparecen los visibles esa noche.</p>
            <div class="picker">
              @for (row of visibleObjects(); track row.object.id) {
                <label class="check-row">
                  <input
                    type="checkbox"
                    [checked]="selectedObjects().has(row.object.id)"
                    (change)="toggleObject(row.object.id, $any($event.target).checked)"
                  />
                  <span>{{ row.object.name }}</span>
                </label>
              }
            </div>
            <h3 class="mt-4">Add-ons</h3>
            <div class="picker">
              @for (m of menu(); track m.id) {
                <label class="check-row">
                  <input
                    type="checkbox"
                    [checked]="selectedAddons().has(m.id)"
                    (change)="toggleAddon(m.id, $any($event.target).checked)"
                  />
                  <span>{{ m.name }}</span>
                  <span class="mono">{{ eur(m.priceCents) }}</span>
                </label>
              }
            </div>
            @if (!booking()) {
              <button type="button" class="btn btn-primary btn-block mt-4" [disabled]="busy()" (click)="hold()">
                {{ busy() ? 'Reteniendo…' : 'Retener 15 min' }}
              </button>
            } @else {
              <button type="button" class="btn btn-primary btn-block mt-4" [disabled]="busy() || remainSec() <= 0" (click)="confirm()">
                {{ busy() ? 'Confirmando…' : 'Confirmar reserva' }}
              </button>
            }
          </section>
          <aside class="card">
            <h3>Resumen</h3>
            <ul class="lines-list">
              <li>
                <span>{{ instrument()!.name }} × {{ partySize() }}</span>
                <strong class="mono">{{ eur(instrument()!.priceCents * partySize()) }}</strong>
              </li>
              @for (m of selectedAddonItems(); track m.id) {
                <li>
                  <span>{{ m.name }}</span>
                  <strong class="mono">{{ eur(m.priceCents) }}</strong>
                </li>
              }
            </ul>
            <p class="total">{{ eur(liveTotalCents()) }}</p>
          </aside>
        </div>
      }
    </div>
  `,
})
export class CheckoutComponent extends FormatBase implements OnInit, OnDestroy {
  readonly slotId = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly slot = signal<Slot | null>(null);
  protected readonly instrument = signal<Instrument | null>(null);
  protected readonly menu = signal<MenuItem[]>([]);
  protected readonly objects = signal<VisibleObject[]>([]);
  protected readonly partySize = signal(1);
  protected readonly selectedObjects = signal<Set<string>>(new Set());
  protected readonly selectedAddons = signal<Set<string>>(new Set());
  protected readonly booking = signal<BookingDetailResponse | null>(null);
  protected readonly remainSec = signal(0);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  private timer: ReturnType<typeof setInterval> | null = null;

  protected readonly maxParty = computed(() => this.instrument()?.maxParty || 4);
  protected readonly visibleObjects = computed(() => this.objects().filter((o) => o.visible));
  protected readonly selectedAddonItems = computed(() =>
    this.menu().filter((m) => this.selectedAddons().has(m.id)),
  );
  protected readonly liveTotalCents = computed(() => {
    const inst = this.instrument();
    if (!inst) return 0;
    const addons = this.selectedAddonItems().reduce((s, m) => s + m.priceCents, 0);
    return inst.priceCents * this.partySize() + addons;
  });

  ngOnInit(): void {
    this.api.slot(this.slotId()).subscribe({
      next: (res) => {
        this.slot.set(res.slot);
        this.instrument.set(res.instrument);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se encontró la franja.');
        this.loading.set(false);
      },
    });
    this.api.objects({ slotId: this.slotId() }).subscribe({
      next: (res) => this.objects.set(res.items || []),
    });
    this.api.menu().subscribe({
      next: (res) => this.menu.set(res.items || []),
    });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVis);
      window.addEventListener('focus', this.onVis);
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVis);
      window.removeEventListener('focus', this.onVis);
    }
  }

  clampParty(n: number): number {
    const max = this.maxParty();
    if (!Number.isFinite(n) || n < 1) return 1;
    return n > max ? max : n;
  }

  toggleObject(id: string, on: boolean): void {
    const next = new Set(this.selectedObjects());
    if (on) next.add(id);
    else next.delete(id);
    this.selectedObjects.set(next);
  }

  toggleAddon(id: string, on: boolean): void {
    const next = new Set(this.selectedAddons());
    if (on) next.add(id);
    else next.delete(id);
    this.selectedAddons.set(next);
  }

  hold(): void {
    this.busy.set(true);
    this.error.set('');
    this.api
      .hold({
        slotId: this.slotId(),
        partySize: this.partySize(),
        objectIds: [...this.selectedObjects()],
        addonIds: [...this.selectedAddons()],
      })
      .subscribe({
        next: (res) => {
          this.booking.set(res);
          this.busy.set(false);
          this.startTimer(res.expiresAt || res.booking?.expiresAt);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(httpMessage(err, 'No se pudo retener la franja.'));
        },
      });
  }

  confirm(): void {
    const b = this.booking();
    if (!b) return;
    this.busy.set(true);
    this.error.set('');
    this.api.confirm(b.booking.id).subscribe({
      next: (res) => {
        this.busy.set(false);
        void this.router.navigate(['/reservas', res.booking.id, 'confirmacion']);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(httpMessage(err, 'No se pudo confirmar.'));
      },
    });
  }

  private startTimer(expires?: string | Date | null): void {
    this.expiresAt = expires ? new Date(expires).getTime() : Date.now() + 15 * 60 * 1000;
    this.syncRemain();
    this.clearTimer();
    this.timer = setInterval(() => this.syncRemain(), 1000);
  }

  private expiresAt = 0;

  private readonly onVis = () => this.syncRemain();

  private syncRemain(): void {
    if (!this.expiresAt) return;
    const left = Math.max(0, Math.floor((this.expiresAt - Date.now()) / 1000));
    this.remainSec.set(left);
    if (left <= 0) this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
