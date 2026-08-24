import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Booking,
  BookingLine,
  CelestialObject,
  CheckIn,
  EmailLog,
  Instrument,
  MenuItem,
  NightSlot,
  QueueEntry,
  Review,
  SkyNight,
  User,
} from '../entities/entities';
import { addDaysIso, madridDate, madridStartsAt, NIGHT_TIMES } from '../common/visibility';
import { makeTicketCode } from '../common/qr';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Instrument) private readonly instruments: Repository<Instrument>,
    @InjectRepository(NightSlot) private readonly slots: Repository<NightSlot>,
    @InjectRepository(CelestialObject) private readonly objects: Repository<CelestialObject>,
    @InjectRepository(SkyNight) private readonly skies: Repository<SkyNight>,
    @InjectRepository(MenuItem) private readonly menu: Repository<MenuItem>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
    @InjectRepository(QueueEntry) private readonly queue: Repository<QueueEntry>,
    @InjectRepository(CheckIn) private readonly checkins: Repository<CheckIn>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB === 'false') return;
    await this.seed();
  }

  async seed() {
    const existing = await this.users.findOne({ where: { email: 'demo@sextante.dev' } });
    if (existing) return;

    const hash = await bcrypt.hash('demo1234', 10);
    const demo = (await this.users.save({
      username: 'demo',
      email: 'demo@sextante.dev',
      passwordHash: hash,
      role: 'player',
      points: 0,
    } as any)) as User;
    const staff = (await this.users.save({
      username: 'staff',
      email: 'staff@sextante.dev',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any)) as User;
    const guest = (await this.users.save({
      username: 'nuria',
      email: 'nuria@sextante.dev',
      passwordHash: hash,
      role: 'player',
      points: 0,
    } as any)) as User;

    const instDefs = [
      {
        slug: 'refractor-150',
        name: 'Cúpula Meridiano',
        type: 'planets',
        apertureMm: 150,
        mount: 'Ecuatorial alemana',
        description:
          'Refractor de 150 mm para planetas y Luna. Un grupo por franja: el telescopio es exclusivo.',
        photoUrl: '/assets/refractor.jpg',
        priceCents: 2800,
      },
      {
        slug: 'schmidt-200',
        name: 'Cúpula Azimut',
        type: 'deep',
        apertureMm: 200,
        mount: 'Schmidt-Cassegrain GoTo',
        description: '200 mm catadióptrico. Cúmulos y nebulosas con seguimiento automático.',
        photoUrl: '/assets/schmidt.jpg',
        priceCents: 3600,
      },
      {
        slug: 'dobson-250',
        name: 'Cúpula Zenit',
        type: 'deep',
        apertureMm: 250,
        mount: 'Dobson altazimutal',
        description: 'Apertura generosa para cielo profundo. Empuje suave, sin motores.',
        photoUrl: '/assets/dobson.jpg',
        priceCents: 4200,
      },
      {
        slug: 'solar-halpha',
        name: 'Terraza H-alpha',
        type: 'solar',
        apertureMm: 80,
        mount: 'Solar H-alpha',
        description: 'Filtro H-alpha para protuberancias. Sesiones diurnas y ocasionales al atardecer.',
        photoUrl: '/assets/solar.jpg',
        priceCents: 2400,
      },
    ];
    const insts: Instrument[] = [];
    for (const d of instDefs) {
      insts.push((await this.instruments.save({ ...d, maxParty: 4, active: true } as any)) as Instrument);
    }

    const objDefs = [
      { slug: 'luna', name: 'Luna', kind: 'moon', visibleMonths: [1,2,3,4,5,6,7,8,9,10,11,12], minAltitudeDeg: 10, avoidFullMoon: false, notes: 'Fases y cráteres.' },
      { slug: 'jupiter', name: 'Júpiter', kind: 'planet', visibleMonths: [7,8,9,10,11], minAltitudeDeg: 20, avoidFullMoon: false, notes: 'Bandas y lunas galileanas.' },
      { slug: 'saturno', name: 'Saturno', kind: 'planet', visibleMonths: [8,9,10,11], minAltitudeDeg: 18, avoidFullMoon: false, notes: 'Anillos en oposición tardía.' },
      { slug: 'marte', name: 'Marte', kind: 'planet', visibleMonths: [11,12,1,2], minAltitudeDeg: 20, avoidFullMoon: false, notes: 'Disco pequeño fuera de oposición.' },
      { slug: 'm13', name: 'M13 Hércules', kind: 'dso', visibleMonths: [5,6,7,8,9], minAltitudeDeg: 25, avoidFullMoon: true, notes: 'Cúmulo globular.' },
      { slug: 'm31', name: 'M31 Andrómeda', kind: 'dso', visibleMonths: [9,10,11,12,1], minAltitudeDeg: 25, avoidFullMoon: true, notes: 'Galaxia cercana.' },
      { slug: 'm42', name: 'M42 Orión', kind: 'dso', visibleMonths: [11,12,1,2,3], minAltitudeDeg: 22, avoidFullMoon: true, notes: 'Nebulosa de Orión.' },
      { slug: 'vega', name: 'Vega / Lyra', kind: 'double', visibleMonths: [6,7,8,9], minAltitudeDeg: 30, avoidFullMoon: false, notes: 'Epsilon Lyrae si el seeing ayuda.' },
      { slug: 'albireo', name: 'Albireo', kind: 'double', visibleMonths: [6,7,8,9,10], minAltitudeDeg: 25, avoidFullMoon: false, notes: 'Par dorado y azul.' },
    ];
    const objs: CelestialObject[] = [];
    for (const d of objDefs) {
      objs.push((await this.objects.save({ ...d, active: true } as any)) as CelestialObject);
    }

    const menuDefs = [
      { slug: 'mapa', name: 'Mapa estelar imprimible', priceCents: 400 },
      { slug: 'termo', name: 'Termo de café de cúpula', priceCents: 350 },
      { slug: 'foto-lunar', name: 'Foto lunar digital', priceCents: 600 },
    ];
    const menus: MenuItem[] = [];
    for (const d of menuDefs) {
      menus.push((await this.menu.save({ ...d, active: true } as any)) as MenuItem);
    }

    const today = madridDate();
    await this.skies.save({ date: today, status: 'open', note: 'Seeing bueno. Viento flojo.', updatedById: staff.id, updatedAt: new Date() } as any);
    await this.skies.save({ date: addDaysIso(today, 3), status: 'limited', note: 'Nubes altas a partir de las 23:00.', updatedById: staff.id, updatedAt: new Date() } as any);
    await this.skies.save({ date: addDaysIso(today, 5), status: 'closed', note: 'Frente nuboso. Observatorio cerrado.', updatedById: staff.id, updatedAt: new Date() } as any);

    for (let d = 0; d <= 14; d++) {
      const date = addDaysIso(today, d);
      for (const inst of insts) {
        for (const t of NIGHT_TIMES) {
          await this.slots.save({
            instrumentId: inst.id,
            date,
            startTime: t,
            durationMin: 60,
            blocked: false,
            startsAt: madridStartsAt(date, t),
          } as any);
        }
      }
    }

    const slotPast = await this.slots.findOne({
      where: { instrumentId: insts[0].id, date: addDaysIso(today, -2), startTime: '21:00' },
    });
    // generate past slots too
    let pastSlot = slotPast;
    if (!pastSlot) {
      pastSlot = (await this.slots.save({
        instrumentId: insts[0].id,
        date: addDaysIso(today, -2),
        startTime: '21:00',
        durationMin: 60,
        blocked: false,
        startsAt: madridStartsAt(addDaysIso(today, -2), '21:00'),
      } as any)) as NightSlot;
    }

    const luna = objs.find((o) => o.slug === 'luna')!;
    const jup = objs.find((o) => o.slug === 'jupiter')!;
    const sat = objs.find((o) => o.slug === 'saturno')!;

    const completed = await this.createBooking({
      user: demo,
      slot: pastSlot,
      status: 'completed',
      partySize: 2,
      objects: [luna, jup],
      addon: menus[0],
      code: makeTicketCode('completed'),
    });
    await this.checkins.save({
      bookingId: completed.id,
      staffId: staff.id,
      scannedAt: new Date(Date.now() - 48 * 3600 * 1000),
    } as any);
    await this.reviews.save({
      bookingId: completed.id,
      userId: demo.id,
      instrumentId: insts[0].id,
      rating: 5,
      comment: 'Júpiter nítido. El staff cambió al ocular de 9 mm a tiempo.',
    } as any);
    demo.points = 10 * 2;
    await this.users.save(demo as any);

    const tonight = (await this.slots.findOne({
      where: { instrumentId: insts[1].id, date: today, startTime: '22:00' },
    })) as NightSlot;
    const confirmed = await this.createBooking({
      user: demo,
      slot: tonight,
      status: 'confirmed',
      partySize: 3,
      objects: [sat, luna],
      addon: menus[2],
      code: 'SXDEMOCONF01',
    });
    await this.emails.save({
      userId: demo.id,
      bookingId: confirmed.id,
      kind: 'ticket',
      toEmail: demo.email,
      body: `Ticket ${confirmed.code} confirmado. Cúpula Azimut 22:00.`,
    } as any);

    const holdSlot = (await this.slots.findOne({
      where: { instrumentId: insts[2].id, date: today, startTime: '20:00' },
    })) as NightSlot;
    await this.createBooking({
      user: guest,
      slot: holdSlot,
      status: 'pending',
      partySize: 1,
      objects: [jup],
      addon: null,
      code: makeTicketCode('pending'),
      expiresAt: new Date(Date.now() + 12 * 60 * 1000),
    });

    const expiredSlot = (await this.slots.findOne({
      where: { instrumentId: insts[3].id, date: today, startTime: '19:00' },
    })) as NightSlot;
    await this.createBooking({
      user: guest,
      slot: expiredSlot,
      status: 'expired',
      partySize: 1,
      objects: [luna],
      addon: null,
      code: makeTicketCode('expired'),
      expiresAt: new Date(Date.now() - 5 * 60 * 1000),
    });

    // extra completed nights for the 7-day chart
    for (let i = 1; i <= 5; i++) {
      const date = addDaysIso(today, -i);
      const s = (await this.slots.save({
        instrumentId: insts[i % insts.length].id,
        date,
        startTime: '21:00',
        durationMin: 60,
        blocked: false,
        startsAt: madridStartsAt(date, '21:00'),
      } as any)) as NightSlot;
      const b = await this.createBooking({
        user: i % 2 ? demo : guest,
        slot: s,
        status: 'completed',
        partySize: 1 + (i % 3),
        objects: [luna],
        addon: null,
        code: makeTicketCode('hist' + i),
      });
      if (i % 2) {
        const u = await this.users.findOne({ where: { id: demo.id } });
        if (u) {
          u.points += 10 * b.partySize;
          await this.users.save(u as any);
        }
      }
    }
  }

  private async createBooking(opts: {
    user: User;
    slot: NightSlot;
    status: Booking['status'];
    partySize: number;
    objects: CelestialObject[];
    addon: MenuItem | null;
    code: string;
    expiresAt?: Date;
  }) {
    const inst = await this.instruments.findOne({ where: { id: opts.slot.instrumentId } });
    const unit = inst?.priceCents || 2800;
    const base = unit * opts.partySize;
    const extra = opts.addon ? opts.addon.priceCents : 0;
    const booking = (await this.bookings.save({
      userId: opts.user.id,
      slotId: opts.slot.id,
      status: opts.status,
      partySize: opts.partySize,
      expiresAt: opts.expiresAt || null,
      code: opts.code,
      totalCents: base + extra,
      confirmedAt: opts.status === 'pending' ? null : new Date(),
    } as any)) as Booking;
    await this.lines.save({
      bookingId: booking.id,
      kind: 'base',
      label: `${inst?.name || 'Cúpula'} × ${opts.partySize}`,
      quantity: opts.partySize,
      unitCents: unit,
      amountCents: base,
      menuItemId: null,
    } as any);
    if (opts.addon) {
      await this.lines.save({
        bookingId: booking.id,
        kind: 'addon',
        label: opts.addon.name,
        quantity: 1,
        unitCents: opts.addon.priceCents,
        amountCents: opts.addon.priceCents,
        menuItemId: opts.addon.id,
      } as any);
    }
    let pos = 0;
    for (const o of opts.objects) {
      await this.queue.save({
        bookingId: booking.id,
        objectId: o.id,
        position: pos,
        nowViewing: pos === 0 && opts.status === 'checked_in',
      } as any);
      pos += 1;
    }
    return booking;
  }
}
