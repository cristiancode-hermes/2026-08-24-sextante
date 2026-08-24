import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ALL_ENTITIES, Booking, CelestialObject, Instrument, MenuItem, NightSlot, SkyNight, User } from '../entities/entities';
import { BookingsService } from './bookings.service';
import { madridStartsAt } from '../common/visibility';
import * as bcrypt from 'bcryptjs';

describe('BookingsService transactional', () => {
  let svc: BookingsService;
  let users: Repository<User>;
  let instruments: Repository<Instrument>;
  let slots: Repository<NightSlot>;
  let objects: Repository<CelestialObject>;
  let skies: Repository<SkyNight>;
  let bookings: Repository<Booking>;
  let menu: Repository<MenuItem>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
        } as any),
        TypeOrmModule.forFeature(ALL_ENTITIES),
      ],
      providers: [BookingsService],
    }).compile();
    svc = moduleRef.get(BookingsService);
    users = moduleRef.get(getRepositoryToken(User));
    instruments = moduleRef.get(getRepositoryToken(Instrument));
    slots = moduleRef.get(getRepositoryToken(NightSlot));
    objects = moduleRef.get(getRepositoryToken(CelestialObject));
    skies = moduleRef.get(getRepositoryToken(SkyNight));
    bookings = moduleRef.get(getRepositoryToken(Booking));
    menu = moduleRef.get(getRepositoryToken(MenuItem));
  });

  let n = 0;
  async function fixture() {
    n += 1;
    const hash = await bcrypt.hash('demo1234', 10);
    const a = (await users.save({
      username: `ana${n}`,
      email: `ana${n}@t.dev`,
      passwordHash: hash,
      role: 'player',
      points: 0,
    } as any)) as User;
    const b = (await users.save({
      username: `ben${n}`,
      email: `ben${n}@t.dev`,
      passwordHash: hash,
      role: 'player',
      points: 0,
    } as any)) as User;
    const staff = (await users.save({
      username: `staff${n}`,
      email: `st${n}@t.dev`,
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any)) as User;
    const inst = (await instruments.save({
      slug: `r150-${n}`,
      name: 'Meridiano',
      type: 'planets',
      apertureMm: 150,
      mount: 'EQ',
      description: 'x',
      photoUrl: '/assets/refractor.jpg',
      priceCents: 2800,
      maxParty: 4,
      active: true,
    } as any)) as Instrument;
    const slot = (await slots.save({
      instrumentId: inst.id,
      date: '2026-08-24',
      startTime: '21:00',
      durationMin: 60,
      blocked: false,
      startsAt: madridStartsAt('2026-08-24', '21:00'),
    } as any)) as NightSlot;
    const sat = (await objects.save({
      slug: `saturno-${n}`,
      name: 'Saturno',
      kind: 'planet',
      visibleMonths: [8, 9, 10, 11],
      minAltitudeDeg: 18,
      avoidFullMoon: false,
      notes: '',
      active: true,
    } as any)) as CelestialObject;
    const mars = (await objects.save({
      slug: `marte-${n}`,
      name: 'Marte',
      kind: 'planet',
      visibleMonths: [11, 12, 1, 2],
      minAltitudeDeg: 20,
      avoidFullMoon: false,
      notes: '',
      active: true,
    } as any)) as CelestialObject;
    const skyDate = `2026-08-${String(10 + n).padStart(2, '0')}`;
    await skies.save({ date: skyDate, status: 'open', note: '', updatedById: staff.id, updatedAt: new Date() } as any);
    slot.date = '2026-08-24';
    return { a, b, staff, inst, slot, sat, mars, skyDate };
  }

  it('hold creates pending with server expiresAt ~15 min', async () => {
    const f = await fixture();
    const out = await svc.hold(f.a.id, { slotId: f.slot.id, partySize: 2, objectIds: [f.sat.id] });
    expect(out.booking.status).toBe('pending');
    const ms = new Date(out.expiresAt as Date).getTime() - Date.now();
    expect(ms).toBeGreaterThan(14 * 60 * 1000);
    expect(ms).toBeLessThan(16 * 60 * 1000);
    expect(out.totalCents).toBe(5600);
    expect(out.queue.length).toBe(1);
  });

  it('same user second hold → 409 ALREADY_HELD', async () => {
    const f = await fixture();
    await svc.hold(f.a.id, { slotId: f.slot.id, partySize: 1, objectIds: [f.sat.id] });
    await expect(
      svc.hold(f.a.id, { slotId: f.slot.id, partySize: 1, objectIds: [f.sat.id] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('other user on taken slot → 409 ALREADY_TAKEN', async () => {
    const f = await fixture();
    await svc.hold(f.a.id, { slotId: f.slot.id, partySize: 1, objectIds: [f.sat.id] });
    try {
      await svc.hold(f.b.id, { slotId: f.slot.id, partySize: 1, objectIds: [f.sat.id] });
      fail('expected 409');
    } catch (e) {
      expect(e).toBeInstanceOf(ConflictException);
      expect((e as ConflictException).getResponse()).toMatchObject({ code: 'ALREADY_TAKEN' });
    }
  });

  it('SKY_CLOSED blocks hold', async () => {
    const f = await fixture();
    let sky = await skies.findOne({ where: { date: f.slot.date } });
    if (!sky) {
      sky = (await skies.save({
        date: f.slot.date,
        status: 'closed',
        note: '',
        updatedById: f.staff.id,
        updatedAt: new Date(),
      } as any)) as SkyNight;
    } else {
      sky.status = 'closed';
      await skies.save(sky as any);
    }
    try {
      await svc.hold(f.a.id, { slotId: f.slot.id, partySize: 1, objectIds: [f.sat.id] });
      fail('expected closed');
    } catch (e) {
      expect((e as ConflictException).getResponse()).toMatchObject({ code: 'SKY_CLOSED' });
    }
    sky.status = 'open';
    await skies.save(sky as any);
  });

  it('OBJECT_NOT_VISIBLE when Mars in August', async () => {
    const f = await fixture();
    try {
      await svc.hold(f.a.id, { slotId: f.slot.id, partySize: 1, objectIds: [f.mars.id] });
      fail('expected not visible');
    } catch (e) {
      expect((e as ConflictException).getResponse()).toMatchObject({ code: 'OBJECT_NOT_VISIBLE' });
    }
  });

  it('sweeper expires stale pending', async () => {
    const f = await fixture();
    const out = await svc.hold(f.a.id, { slotId: f.slot.id, partySize: 1, objectIds: [f.sat.id] });
    const row = await bookings.findOne({ where: { id: out.booking.id } });
    row!.expiresAt = new Date(Date.now() - 1000);
    await bookings.save(row as any);
    const n = await svc.expireStale();
    expect(n).toBe(1);
    const again = await bookings.findOne({ where: { id: out.booking.id } });
    expect(again!.status).toBe('expired');
  });

  it('confirm then check-in; second scan 409', async () => {
    const f = await fixture();
    const hold = await svc.hold(f.a.id, { slotId: f.slot.id, partySize: 1, objectIds: [f.sat.id] });
    const paid = await svc.confirm(f.a.id, hold.booking.id, 'nonce');
    expect(paid.booking.status).toBe('confirmed');
    expect(paid.qrSvg).toContain('<svg');
    const first = await svc.checkIn(f.staff.id, paid.code);
    expect(first.booking.status).toBe('checked_in');
    await expect(svc.checkIn(f.staff.id, paid.code)).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirmed same-user blocks re-hold', async () => {
    const f = await fixture();
    const hold = await svc.hold(f.a.id, { slotId: f.slot.id, partySize: 1, objectIds: [f.sat.id] });
    await svc.confirm(f.a.id, hold.booking.id, 'x');
    try {
      await svc.hold(f.a.id, { slotId: f.slot.id, partySize: 1, objectIds: [f.sat.id] });
      fail('expected booked');
    } catch (e) {
      expect((e as ConflictException).getResponse()).toMatchObject({ code: 'ALREADY_BOOKED' });
    }
  });

  it('list totals equal SUM of lines', async () => {
    const f = await fixture();
    const hold = await svc.hold(f.a.id, { slotId: f.slot.id, partySize: 2, objectIds: [f.sat.id] });
    const list = await svc.listMine(f.a.id);
    const detail = await svc.getOne(f.a.id, hold.booking.id, 'player');
    expect(list.items[0].totalCents).toBe(detail.totalCents);
    expect(detail.totalCents).toBe(detail.lines.reduce((s, l) => s + l.amountCents, 0));
  });

  it('advance queue sets a single nowViewing', async () => {
    const f = await fixture();
    const extra = (await objects.save({
      slug: `luna-${n}`,
      name: 'Luna',
      kind: 'moon',
      visibleMonths: [8],
      minAltitudeDeg: 10,
      avoidFullMoon: false,
      notes: '',
      active: true,
    } as any)) as CelestialObject;
    const hold = await svc.hold(f.a.id, {
      slotId: f.slot.id,
      partySize: 1,
      objectIds: [f.sat.id, extra.id],
    });
    await svc.confirm(f.a.id, hold.booking.id, 'x');
    await svc.checkIn(f.staff.id, hold.booking.code);
    const q1 = await svc.getQueue(hold.booking.id);
    expect(q1.entries.filter((e) => e.nowViewing).length).toBe(1);
    await svc.advance(f.a.id, hold.booking.id, 'player');
    const q2 = await svc.getQueue(hold.booking.id);
    expect(q2.entries.filter((e) => e.nowViewing).length).toBe(1);
    expect(q2.entries.find((e) => e.nowViewing)?.position).toBe(1);
  });
});
