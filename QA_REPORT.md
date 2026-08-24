# QA Report — 2026-08-24 Sextante

**Project:** Observatorio municipal B2C — cúpula exclusiva, visibilidad real y ticket QR
**Stack:** Angular 22 (zoneless) + NestJS 11 + TypeORM + SQLite
**Author:** Hermes Daily Builder + QA 2026-08-24
**Design lock:** DESIGN_FREE (proyecto nuevo)

## ✅ 1. Build Verification

| Target | Status | Details |
|---|---|---|
| API `tsc --incremental false` | ✅ | `apps/api/dist/main.js` |
| Web `ng build --configuration=production` | ✅ | `apps/web/dist/web/browser/index.html` + `baseHref: /` |
| Tailwind | N/A | CSS custom properties (no Tailwind build step) |

## ✅ 2. Test Results

18 test cases · Jest · ALL PASSED

| Suite | Cases |
|---|---|
| `bookings.int.spec.ts` | 10 (same-user 409, ALREADY_TAKEN, SKY_CLOSED, sweeper, already booked, …) |
| `visibility.spec.ts` | 6 |
| `qr.spec.ts` | 2 |

New tests: existing coverage adequate (≥18).

## ✅ 3. Binary / Runtime Verification

API `PORT=3073` + `SEED_DB` default-on. Endpoint smoke **46/46 PASS** (10 curl + 36 python).

| Check | Result |
|---|---|
| Health / featured / instruments / sky / objects / menu | 200 |
| Login email + username + staff | 201 + `accessToken` |
| Register unique | 201 |
| `freeSlotsToday` home = catálogo | 26 = 26 |
| Slots 18:00→00:00 (medianoche al final) | PASS |
| Fotos `/assets/*.jpg` del vertical | PASS |
| Hold `expiresAt` servidor + pending | PASS |
| Same-user 409 `ALREADY_HELD` | PASS |
| Confirm + ticket code + QR | PASS |
| Check-in + segundo scan 409 `ALREADY_CHECKED_IN` | PASS |
| Cola post check-in (`nowViewing`) | PASS |
| Lista ↔ detalle `totalCents` | PASS (n=5) |
| Puntos demo derivados | 80 |
| Staff stats series 7 días (date + occupancy + revenue) | PASS |
| Auth `/bookings` sin token | 401 |
| Auth routes `/login` `/entrar` `/registro` antes del `**` | PASS |

Browser smoke (Puppeteer, 14/14): home, login vacío + creds demo debajo, token namespaced, catálogo 4, `/cupulas/:id` con 7 franjas, `/mis-noches` + detalle, alias `/entrar`, sin overflow 390/1280, consola limpia.

## ✅ 4. Quality Audit

| Criterion | Verdict | Notes |
|---|---|---|
| Capa de valor de verdad | PASS | Motor de visibilidad + `SkyNight` + cola post check-in |
| Ciclo transaccional A–F | PASS | expiresAt server, sweeper 30s, mutex 409, QR, puntos 10×partySize |
| Rutas dinámicas | PASS | `/cupulas/:id` y `/mis-noches/:id` cargan en `ngOnInit` |
| Totales lista ↔ detalle | PASS | |
| Gráfico staff | PASS | ejes + fechas + `<title>` tooltips |
| Login layout | PASS | Minimalista sin caja (rotación 2b) |
| JWT namespaced | PASS | `sextante.accessToken`; interceptor lee localStorage (no AuthService) |
| Interceptor `Bearer` | PASS | `'***' in src` = False |
| Zoneless | PASS | `provideZonelessChangeDetection` |
| contraste-hover | **PASS** | `a:hover:not(.btn)` + on-primary en hover/focus/active |
| Contraste AA light/dark | PASS | on-primary/primary 10.56 / 6.53; hover 12.44 / 4.76 |

### Issues found & fixed in QA

| Issue | Severity | Fix |
|---|---|---|
| CSS de `.topnav` / `.brand-mark` / drawer ausente → «SSextante», viñetas, Oscuro/Salir duplicados | Major (UI) | Añadido CSS de shell (marca, list-style none, desktop-only vs drawer). Rebuild + recapture. |

### Minor Issues

| Issue | Severity | Suggestion |
|---|---|---|
| TOKEN_KEY namespaced | Info | Registrado en `prod-capture.mjs` (ambos bloques) |

## ✅ 5. Security Scan

| Check | Result |
|---|---|
| JWT + bcrypt | PASS |
| Guards por ruta (no APP_GUARD global) | PASS |
| ValidationPipe whitelist | PASS |
| `.env` gitignored | PASS |
| Demo password only in seed + UI hint | PASS (esperado) |

## ✅ 6. Deployment

| Target | Result | Details |
|---|---|---|
| API :3073 | ✅ | live, seed demo@sextante.dev / demo1234 |
| Caddy | ✅ | `sextante.proyectos.cristiancode.dev` → 200 |
| manage-apis.sh | ✅ | ALIGNED 58 (3073 / sextante / 2026-08-24-sextante) |
| GitHub | ✅ | https://github.com/cristiancode-hermes/2026-08-24-sextante |
| README | ✅ | link2 200 |
| Landing | ✅ | `name:'sextante'` live |
| Portfolio es/en/pt | ✅ | slug `sextante`, heading-219, date 2026-08-24 |
| Capture config | ✅ | config.mjs + prod-capture slug + token key |
| Excel | ✅ | fila 90, Completado |
| Assets | ✅ | `/assets/sextante.png` + `-m.png` |

## Summary

**OVERALL: PASS ✅**

Live: https://sextante.proyectos.cristiancode.dev  
Repo: https://github.com/cristiancode-hermes/2026-08-24-sextante  
Demo: `demo@sextante.dev` / `demo1234` · staff: `staff@sextante.dev` / `demo1234`
