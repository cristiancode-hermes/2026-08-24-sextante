import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FormatBase, httpMessage } from '../shared/format';
import type { Booking } from '../shared/models';

@Component({
  selector: 'app-review-form',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <h1>Reseña</h1>
      <p class="lead">Solo tras completar una noche en esta cúpula.</p>
      <label class="field">
        Reserva completada
        <select [ngModel]="bookingId()" (ngModelChange)="bookingId.set($event)">
          <option value="">Elige una reserva</option>
          @for (b of completed(); track b.id) {
            <option [value]="b.id">{{ b.code }} · {{ formatDate(b.slot?.date) }}</option>
          }
        </select>
      </label>
      <label class="field">
        Nota (1–5)
        <input type="number" min="1" max="5" [ngModel]="rating()" (ngModelChange)="rating.set(+$event || 5)" />
      </label>
      <label class="field">
        Comentario
        <textarea [ngModel]="comment()" (ngModelChange)="comment.set($event)"></textarea>
      </label>
      @if (error()) {
        <p class="form-error">{{ error() }}</p>
      }
      <button type="button" class="btn btn-primary" [disabled]="!bookingId() || busy()" (click)="submit()">
        Publicar
      </button>
      <p class="mt-3"><a [routerLink]="['/cupulas', id()]">Volver a la cúpula</a></p>
    </div>
  `,
})
export class ReviewFormComponent extends FormatBase implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly completed = signal<Booking[]>([]);
  protected readonly bookingId = signal('');
  protected readonly rating = signal(5);
  protected readonly comment = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.api.bookings('completed').subscribe({
      next: (res) => {
        this.completed.set(
          (res.items || []).filter((b) => (b.slot?.instrumentId || b.instrument?.id) === this.id()),
        );
      },
    });
  }

  submit(): void {
    if (!this.bookingId()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .createReview({
        bookingId: this.bookingId(),
        rating: this.rating(),
        comment: this.comment() || undefined,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          void this.router.navigate(['/cupulas', this.id()]);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(httpMessage(err, 'No se pudo publicar la reseña.'));
        },
      });
  }
}
