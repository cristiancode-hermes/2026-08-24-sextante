import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <h1>Página no encontrada</h1>
      <p class="lead">Esa ruta no existe en el observatorio.</p>
      <a routerLink="/" class="btn btn-primary">Volver al inicio</a>
    </div>
  `,
})
export class NotFoundComponent {}
