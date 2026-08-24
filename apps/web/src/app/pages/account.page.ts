import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-account',
  imports: [],
  template: `
    <div class="container page">
      <h1>Cuenta</h1>
      @if (auth.user(); as u) {
        <p><strong>{{ u.username }}</strong> · {{ u.email }}</p>
        <p class="points-chip">{{ u.points }} pts</p>
        <p class="text-sm">Rol: {{ u.role }}</p>
      }
      <h2 class="mt-5">Correos del observatorio</h2>
      @if (!emails().length) {
        <p class="text-muted">Sin avisos todavía.</p>
      } @else {
        <ul class="email-list">
          @for (e of emails(); track e.id) {
            <li>
              <strong>{{ e.kind }}</strong>
              <span class="text-sm">{{ e.toEmail }}</span>
              <p>{{ e.body }}</p>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class AccountComponent implements OnInit {
  public auth = inject(AuthService);
  private readonly api = inject(ApiService);
  protected readonly emails = signal<{ id: string; kind: string; toEmail: string; body: string }[]>([]);

  ngOnInit(): void {
    this.auth.refreshProfile();
    this.api.emails().subscribe({
      next: (res) => this.emails.set(res.items || []),
    });
  }
}
