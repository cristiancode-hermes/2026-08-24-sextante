export type UserRole = 'player' | 'staff' | 'admin';
export type InstrumentType = 'planets' | 'deep' | 'solar';
export type ObjectKind = 'planet' | 'moon' | 'dso' | 'double';
export type SkyStatus = 'open' | 'limited' | 'closed';
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'expired';
export type BookingLineKind = 'base' | 'addon' | 'extra';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  points: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Instrument {
  id: string;
  slug: string;
  name: string;
  type: InstrumentType;
  apertureMm: number;
  mount: string;
  description: string;
  photoUrl: string;
  priceCents: number;
  maxParty: number;
  active: boolean;
  freeSlotsToday?: number;
}

export interface Slot {
  id: string;
  instrumentId: string;
  date: string;
  startTime: string;
  durationMin: number;
  blocked: boolean;
  startsAt?: string;
  taken?: boolean;
  status?: 'free' | 'busy' | 'blocked' | string;
  instrument?: Instrument;
}

export interface Sky {
  id?: string;
  date: string;
  status: SkyStatus | string;
  note: string;
  updatedById?: string | null;
  updatedAt?: string;
}

export interface CelestialObject {
  id: string;
  slug: string;
  name: string;
  kind: ObjectKind | string;
  visibleMonths: number[];
  minAltitudeDeg: number;
  avoidFullMoon: boolean;
  notes: string;
  active: boolean;
}

export interface VisibleObject {
  object: CelestialObject;
  visible: boolean;
  reason?: string;
}

export interface BookingLine {
  id: string;
  bookingId?: string;
  kind: BookingLineKind | string;
  label: string;
  quantity: number;
  unitCents: number;
  amountCents: number;
  menuItemId?: string | null;
}

export interface QueueEntry {
  bookingId: string;
  objectId: string;
  position: number;
  nowViewing: boolean;
  object?: CelestialObject;
}

export interface Booking {
  id: string;
  userId?: string;
  slotId?: string;
  status: BookingStatus;
  partySize: number;
  expiresAt?: string | Date | null;
  code: string;
  totalCents: number;
  createdAt?: string;
  confirmedAt?: string | Date | null;
  slot?: Slot;
  instrument?: Instrument;
  lines?: BookingLine[];
  queue?: QueueEntry[];
  checkIn?: { id: string; scannedAt: string } | null;
}

export interface BookingDetailResponse {
  booking: Booking;
  lines: BookingLine[];
  queue: QueueEntry[];
  totalCents: number;
  expiresAt?: string | Date | null;
  checkIn?: unknown;
  qrSvg?: string | null;
  code?: string;
}

export interface MenuItem {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  active?: boolean;
}

export interface StaffStats {
  kpis: {
    nights: number;
    guests: number;
    revenueCents: number;
    occupancyAvg: number;
  };
  series: { date: string; occupancy: number; revenueCents: number }[];
}

export interface Review {
  id: string;
  bookingId: string;
  userId: string;
  instrumentId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export const TOKEN_KEY = 'sextante.accessToken';

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Retenida',
  confirmed: 'Confirmada',
  checked_in: 'En cúpula',
  completed: 'Completada',
  cancelled: 'Cancelada',
  expired: 'Caducada',
};

export const SKY_LABELS: Record<string, string> = {
  open: 'Abierto',
  limited: 'Limitado',
  closed: 'Cerrado',
};

export const TYPE_LABELS: Record<string, string> = {
  planets: 'Planetas',
  deep: 'Cielo profundo',
  solar: 'Solar',
};

export const KIND_LABELS: Record<string, string> = {
  planet: 'Planeta',
  moon: 'Luna',
  dso: 'Cielo profundo',
  double: 'Doble',
};
