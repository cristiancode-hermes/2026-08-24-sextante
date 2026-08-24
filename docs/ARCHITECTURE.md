# Architecture — Sextante

Monorepo `apps/api` (NestJS) + `apps/web` (Angular 22). SQLite en dev (`data/sextante.db`), Postgres/Neon vía `DATABASE_TYPE=postgres`.

## Capas de valor

1. **Visibilidad** (`common/visibility.ts`): un objeto solo entra en el picker si el mes, la luna llena y la altura lo permiten.
2. **SkyNight**: staff abre / limita / cierra la noche. `SKY_CLOSED` → 409 en hold.
3. **Cola viva** post check-in: now-viewing + reorder.

## Transacción

Hold `pending` 15 min con `expiresAt` en servidor. Sweeper ~30 s. Mutex in-process (better-sqlite3). 409 cruzado `ALREADY_TAKEN` y 409 same-user `ALREADY_HELD` / `ALREADY_BOOKED`. Totales = `SUM(BookingLine.amountCents)`. Puntos = 10 × partySize al `completed`.

## Auth

JWT via `JwtModule.registerAsync` + `ConfigService`. Login `identifier` = username o email. Token frontend: `localStorage['sextante.accessToken']`. Interceptor no inyecta AuthService.

## Módulos API

auth, instruments, slots, objects (sky), bookings (queue + check-in), menu, social (reviews + favorites), stats, account, seed, health.
