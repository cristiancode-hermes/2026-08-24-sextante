# Frontend — Sextante

Angular 22 standalone, signals, `provideZonelessChangeDetection()`, CSS propio (Latón de Azimut). API relativa `/api`.

## Rutas

Auth **antes** del shell: `/login`, `/entrar`, `/registro`.

Públicas: `/`, `/cupulas`, `/cupulas/:id`, `/objetos`.

Auth: `/checkout/:slotId`, `/reservas/:id/confirmacion`, `/mis-noches`, `/mis-noches/:id`, `/cuenta`.

Staff: `/staff`, `/staff/cupulas`, `/staff/franjas`, `/staff/cielo`, `/staff/objetos`, `/staff/check-in`.

## Login

Minimalista sin caja. Inputs vacíos, `autocomplete=off` / `new-password`. Credenciales demo **debajo**. Campo identifier (username o email).

## Checkout

Total en vivo **antes** de Retener. Picker solo objetos `visible=true`. Timer desde `expiresAt` servidor. QR en confirmación con `bypassSecurityTrustHtml`.

## Tema

`html[data-theme]` + `localStorage['sextante.theme']`. Contraste-hover: `a:hover:not(.btn)` y `.btn-primary` mantiene `--color-on-primary` en hover/focus/active.
