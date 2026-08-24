import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-minimal">
      <a routerLink="/" class="auth-mark">Sextante</a>
      <h1>Entrar</h1>
      <p class="lead">Reserva una cúpula. Un grupo, un telescopio.</p>
      <form (ngSubmit)="submit()">
        <label class="field">
          Usuario o email
          <input
            name="identifier"
            autocomplete="off"
            [ngModel]="identifier()"
            (ngModelChange)="identifier.set($event)"
          />
        </label>
        <label class="field">
          Contraseña
          <input
            name="password"
            type="password"
            autocomplete="new-password"
            [ngModel]="password()"
            (ngModelChange)="password.set($event)"
          />
        </label>
        @if (error()) {
          <p class="form-error">{{ error() }}</p>
        }
        <button class="btn btn-primary btn-block" type="submit" [disabled]="!canSubmit() || loading()">
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
      <p class="mt-3"><a routerLink="/registro">Crear cuenta</a></p>
      <div class="auth-demo">
        <p class="mb-2">Cuentas de prueba con datos</p>
        <p><code>demo@sextante.dev</code> / <code>demo1234</code></p>
        <p><code>staff@sextante.dev</code> / <code>demo1234</code></p>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  public auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly identifier = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly canSubmit = computed(() => !!this.identifier().trim() && !!this.password());

  submit(): void {
    if (!this.canSubmit()) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login({ identifier: this.identifier().trim(), password: this.password() }).subscribe({
      next: () => {
        this.loading.set(false);
        const ret = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        void this.router.navigateByUrl(ret);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Credenciales inválidas');
      },
    });
  }
}
