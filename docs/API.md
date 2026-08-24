# API — Sextante

Prefijo `/api`. Swagger `/api/docs`. Puerto 3073.

## Auth

| Method | Path | Body |
|--------|------|------|
| POST | /api/auth/register | `{ username, email, password }` |
| POST | /api/auth/login | `{ identifier, password }` |
| GET | /api/auth/me | JWT |

## Catálogo

- `GET /api/instruments` → `{ items, total, freeSlotsToday }`
- `GET /api/instruments/featured` → **mismo** `freeSlotsToday`
- `GET /api/instruments/:id`
- `GET /api/instruments/:id/slots?date=`
- `GET /api/slots/:id`
- `GET /api/objects?date=&slotId=` → `{ items: [{ object, visible, reason }] }`
- `GET /api/sky?date=`
- `GET /api/menu`

## Reservas

- `POST /api/bookings/hold` `{ slotId, partySize, objectIds, addonIds }`
- `PATCH /api/bookings/:id`
- `POST /api/bookings/:id/confirm` `{ paymentNonce }` → `{ booking, code, qrSvg }`
- `POST /api/bookings/:id/cancel`
- `GET /api/bookings` · `GET /api/bookings/:id`
- `GET/PATCH /api/bookings/:id/queue` · `POST .../queue/advance`
- `POST /api/bookings/:id/complete` (staff)

409: `ALREADY_HELD`, `ALREADY_BOOKED`, `ALREADY_TAKEN`, `SKY_CLOSED`, `OBJECT_NOT_VISIBLE`, `ALREADY_CHECKED_IN`.

## Staff

- `POST /api/staff/check-in` `{ code }`
- `GET /api/staff/check-ins?date=`
- `GET /api/staff/stats?from=&to=` → `{ kpis, series }`
- `PUT /api/staff/sky/:date` `{ status, note }`
