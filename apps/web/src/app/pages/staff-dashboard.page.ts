import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-staff-dashboard',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <h1>Staff</h1>
      <nav class="staff-nav">
        <a routerLink="/staff/cupulas" class="btn btn-secondary btn-sm">Cúpulas</a>
        <a routerLink="/staff/franjas" class="btn btn-secondary btn-sm">Franjas</a>
        <a routerLink="/staff/cielo" class="btn btn-secondary btn-sm">Cielo</a>
        <a routerLink="/staff/objetos" class="btn btn-secondary btn-sm">Objetos</a>
        <a routerLink="/staff/check-in" class="btn btn-secondary btn-sm">Check-in</a>
      </nav>
      <div class="kpi-row">
        <div class="kpi"><strong>{{ kpis().nights }}</strong><span>noches</span></div>
        <div class="kpi"><strong>{{ kpis().guests }}</strong><span>invitados</span></div>
        <div class="kpi"><strong>{{ eur(kpis().revenueCents) }}</strong><span>ingresos</span></div>
        <div class="kpi"><strong>{{ kpis().occupancyAvg }}</strong><span>ocupación media</span></div>
      </div>
      <svg class="chart" viewBox="0 0 640 220" role="img" aria-label="Ocupación 7 días">
        <line x1="40" y1="180" x2="620" y2="180" stroke="currentColor" />
        <line x1="40" y1="20" x2="40" y2="180" stroke="currentColor" />
        @for (tick of yTicks(); track tick.label) {
          <text [attr.x]="8" [attr.y]="tick.y" font-size="10">{{ tick.label }}</text>
        }
        @for (p of points(); track p.date) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="5" fill="var(--color-primary)">
            <title>{{ p.date }} · {{ p.occupancy }} noches · {{ eur(p.revenueCents) }}</title>
          </circle>
          <text [attr.x]="p.x" y="200" font-size="11" text-anchor="middle">{{ p.label }}</text>
        }
        @if (points().length > 1) {
          <polyline fill="none" stroke="var(--color-primary)" stroke-width="2" [attr.points]="poly()" />
        }
      </svg>
    </div>
  `,
})
export class StaffDashboardComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly kpis = signal({ nights: 0, guests: 0, revenueCents: 0, occupancyAvg: 0 });
  protected readonly points = signal<
    { date: string; occupancy: number; revenueCents: number; x: number; y: number; label: string }[]
  >([]);
  protected readonly yTicks = signal<{ y: number; label: string }[]>([]);

  ngOnInit(): void {
    this.api.staffStats().subscribe({
      next: (res) => {
        this.kpis.set(res.kpis || this.kpis());
        const series = res.series || [];
        const max = Math.max(1, ...series.map((s) => s.occupancy));
        this.yTicks.set([
          { y: 180, label: '0' },
          { y: 105, label: String(Math.round(max / 2)) },
          { y: 30, label: String(max) },
        ]);
        this.points.set(
          series.map((s, i) => ({
            date: s.date,
            occupancy: s.occupancy,
            revenueCents: s.revenueCents,
            label: s.date.slice(5),
            x: 40 + (i * 560) / Math.max(1, series.length - 1),
            y: 180 - (s.occupancy / max) * 150,
          })),
        );
      },
    });
  }

  poly(): string {
    return this.points()
      .map((p) => `${p.x},${p.y}`)
      .join(' ');
  }
}
