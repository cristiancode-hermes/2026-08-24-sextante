import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

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

export const LIVE_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'checked_in'];

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 200 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'player' })
  role: UserRole;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Booking, (b: Booking) => b.user)
  bookings?: Booking[];
}

@Entity('instruments')
export class Instrument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 16, default: 'planets' })
  type: InstrumentType;

  @Column({ type: 'int' })
  apertureMm: number;

  @Column({ type: 'varchar', length: 40 })
  mount: string;

  @Column({ type: 'varchar', length: 2400, default: '' })
  description: string;

  @Column({ type: 'varchar', length: 400, default: '' })
  photoUrl: string;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'int', default: 4 })
  maxParty: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => NightSlot, (s: NightSlot) => s.instrument)
  slots?: NightSlot[];

  @OneToMany(() => Review, (r: Review) => r.instrument)
  reviews?: Review[];
}

@Entity('night_slots')
@Unique(['instrumentId', 'date', 'startTime'])
export class NightSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  instrumentId: string;

  @ManyToOne(() => Instrument, (i: Instrument) => i.slots, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'instrumentId' })
  instrument?: Instrument;

  @Column({ type: 'varchar', length: 10 })
  date: string;

  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ type: 'int', default: 60 })
  durationMin: number;

  @Column({ type: 'boolean', default: false })
  blocked: boolean;

  @Column({ type: 'datetime' })
  startsAt: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Booking, (b: Booking) => b.slot)
  bookings?: Booking[];
}

@Entity('celestial_objects')
export class CelestialObject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 16 })
  kind: ObjectKind;

  @Column({ type: 'simple-json' })
  visibleMonths: number[];

  @Column({ type: 'int', default: 20 })
  minAltitudeDeg: number;

  @Column({ type: 'boolean', default: false })
  avoidFullMoon: boolean;

  @Column({ type: 'varchar', length: 800, default: '' })
  notes: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

@Entity('sky_nights')
export class SkyNight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  date: string;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: SkyStatus;

  @Column({ type: 'varchar', length: 200, default: '' })
  note: string;

  @Column({ type: 'varchar', nullable: true })
  updatedById: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u: User) => u.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar' })
  slotId: string;

  @ManyToOne(() => NightSlot, (s: NightSlot) => s.bookings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'slotId' })
  slot?: NightSlot;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: BookingStatus;

  @Column({ type: 'int', default: 1 })
  partySize: number;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'varchar', length: 12, unique: true })
  code: string;

  @Column({ type: 'int', default: 0 })
  totalCents: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @OneToMany(() => BookingLine, (l: BookingLine) => l.booking)
  lines?: BookingLine[];

  @OneToMany(() => QueueEntry, (q: QueueEntry) => q.booking)
  queue?: QueueEntry[];

  @OneToOne(() => CheckIn, (c: CheckIn) => c.booking)
  checkIn?: any;
}

@Entity('booking_lines')
export class BookingLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  bookingId: string;

  @ManyToOne(() => Booking, (b: Booking) => b.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar', length: 16 })
  kind: BookingLineKind;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int' })
  unitCents: number;

  @Column({ type: 'int' })
  amountCents: number;

  @Column({ type: 'varchar', nullable: true })
  menuItemId: string | null;
}

@Entity('queue_entries')
export class QueueEntry {
  @PrimaryColumn({ type: 'varchar' })
  bookingId: string;

  @PrimaryColumn({ type: 'varchar' })
  objectId: string;

  @ManyToOne(() => Booking, (b: Booking) => b.queue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @ManyToOne(() => CelestialObject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'objectId' })
  object?: CelestialObject;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'boolean', default: false })
  nowViewing: boolean;
}

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

@Entity('check_ins')
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  bookingId: string;

  @OneToOne(() => Booking, (b: Booking) => b.checkIn, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar' })
  staffId: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  scannedAt: Date;
}

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  bookingId: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  instrumentId: string;

  @ManyToOne(() => Instrument, (i: Instrument) => i.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instrumentId' })
  instrument?: Instrument;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'varchar', length: 800, nullable: true })
  comment: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  bookingId: string | null;

  @Column({ type: 'varchar', length: 24 })
  kind: string;

  @Column({ type: 'varchar', length: 180 })
  toEmail: string;

  @Column({ type: 'varchar', length: 4000 })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity('favorites')
@Index(['userId', 'instrumentId'], { unique: true })
export class Favorite {
  @PrimaryColumn({ type: 'varchar' })
  userId: string;

  @PrimaryColumn({ type: 'varchar' })
  instrumentId: string;
}

export const ALL_ENTITIES = [
  User,
  Instrument,
  NightSlot,
  CelestialObject,
  SkyNight,
  Booking,
  BookingLine,
  QueueEntry,
  MenuItem,
  CheckIn,
  Review,
  EmailLog,
  Favorite,
];
