import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  Booking,
  BookingLine,
  CelestialObject,
  CheckIn,
  EmailLog,
  LIVE_STATUSES,
  MenuItem,
  NightSlot,
  QueueEntry,
  SkyNight,
  User,
} from '../entities/entities';
import { evaluateVisibility } from '../common/visibility';
import { withLock } from '../common/mutex';
import { makeTicketCode, qrSvg } from '../common/qr';

const HOLD_MS = 15 * 60 * 1000;
const POINTS_PER_PERSON = 10;

@Injectable()
export class BookingsService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
    @InjectRepository(QueueEntry) private readonly queue: Repository<QueueEntry>,
    @InjectRepository(NightSlot) private readonly slots: Repository<NightSlot>,
    @InjectRepository(CelestialObject) private readonly objects: Repository<CelestialObject>,
    @InjectRepository(MenuItem) private readonly menu: Repository<MenuItem>,
    @InjectRepository(SkyNight) private readonly skies: Repository<SkyNight>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(CheckIn) private readonly checkins: Repository<CheckIn>,
    @InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.expireStale();
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async expireStale(): Promise<number> {
    const now = new Date();
    const stale = await this.bookings.find({ where: { status: 'pending' } });
    let n = 0;
    for (const b of stale) {
      if (b.expiresAt && b.expiresAt.getTime() < now.getTime()) {
        b.status = 'expired';
        await this.bookings.save(b as any);
        n += 1;
      }
    }
    return n;
  }

  async hold(userId: string, dto: { slotId: string; partySize: number; objectIds: string[]; addonIds?: string[] }) {
    return withLock(() => this.holdInner(userId, dto));
  }

  private async holdInner(
    userId: string,
    dto: { slotId: string; partySize: number; objectIds: string[]; addonIds?: string[] },
  ) {
    await this.expireStale();
    const slot = await this.slots.findOne({ where: { id: dto.slotId }, relations: { instrument: true } });
    if (!slot || !slot.instrument) throw new NotFoundException('Franja no encontrada');
    if (slot.blocked) throw new ConflictException({ code: 'SLOT_BLOCKED', message: 'Franja bloqueada' });

    const sky = await this.skies.findOne({ where: { date: slot.date } });
    if (sky && sky.status === 'closed') {
      throw new ConflictException({ code: 'SKY_CLOSED', message: 'El cielo de esa noche está cerrado.' });
    }

    const partySize = Math.max(1, Math.min(dto.partySize || 1, slot.instrument.maxParty));

    const sameUser = await this.bookings.findOne({
      where: [
        { userId, slotId: slot.id, status: 'pending' },
        { userId, slotId: slot.id, status: 'confirmed' },
        { userId, slotId: slot.id, status: 'checked_in' },
      ],
    });
    if (sameUser) {
      const code = sameUser.status === 'pending' ? 'ALREADY_HELD' : 'ALREADY_BOOKED';
      throw new ConflictException({
        statusCode: 409,
        code,
        message:
          sameUser.status === 'pending'
            ? 'Ya tienes una reserva activa para esta franja.'
            : 'Ya tienes esta cúpula confirmada esa hora.',
      });
    }

    const taken = await this.bookings.findOne({
      where: { slotId: slot.id, status: In(LIVE_STATUSES) },
    });
    if (taken) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_TAKEN',
        message: 'Otro grupo retiene este telescopio.',
      });
    }

    const objectIds = dto.objectIds || [];
    const objs = objectIds.length
      ? await this.objects.find({ where: { id: In(objectIds) } })
      : [];
    if (objs.length !== objectIds.length) throw new BadRequestException('Objeto desconocido');
    for (const o of objs) {
      const vis = evaluateVisibility(o, slot.date);
      if (!vis.visible) {
        throw new ConflictException({
          statusCode: 409,
          code: 'OBJECT_NOT_VISIBLE',
          objectId: o.id,
          message: `${o.name} no es visible esa noche.`,
        });
      }
    }

    const addonIds = dto.addonIds || [];
    const addons = addonIds.length ? await this.menu.find({ where: { id: In(addonIds), active: true } }) : [];

    const expiresAt = new Date(Date.now() + HOLD_MS);
    const code = makeTicketCode(userId + slot.id + Date.now());
    const booking = (await this.bookings.save({
      userId,
      slotId: slot.id,
      status: 'pending',
      partySize,
      expiresAt,
      code,
      totalCents: 0,
    } as any)) as Booking;

    const createdLines: BookingLine[] = [];
    const baseLine = (await this.lines.save({
      bookingId: booking.id,
      kind: 'base',
      label: `${slot.instrument.name} × ${partySize}`,
      quantity: partySize,
      unitCents: slot.instrument.priceCents,
      amountCents: slot.instrument.priceCents * partySize,
      menuItemId: null,
    } as any)) as BookingLine;
    createdLines.push(baseLine);
    for (const a of addons) {
      createdLines.push(
        (await this.lines.save({
          bookingId: booking.id,
          kind: 'addon',
          label: a.name,
          quantity: 1,
          unitCents: a.priceCents,
          amountCents: a.priceCents,
          menuItemId: a.id,
        } as any)) as BookingLine,
      );
    }
    booking.totalCents = createdLines.reduce((s, l) => s + l.amountCents, 0);
    await this.bookings.save(booking as any);

    let pos = 0;
    const queue: QueueEntry[] = [];
    for (const o of objs) {
      queue.push(
        (await this.queue.save({
          bookingId: booking.id,
          objectId: o.id,
          position: pos,
          nowViewing: pos === 0,
        } as any)) as QueueEntry,
      );
      pos += 1;
    }

    return this.serialize(booking.id);
  }

  async updateHold(
    userId: string,
    id: string,
    dto: { partySize?: number; objectIds?: string[]; addonIds?: string[] },
  ) {
    return withLock(async () => {
      await this.expireStale();
      const booking = await this.bookings.findOne({
        where: { id },
        relations: { slot: { instrument: true }, lines: true, queue: true },
      });
      if (!booking) throw new NotFoundException('Reserva no encontrada');
      if (booking.userId !== userId) throw new ForbiddenException();
      if (booking.status !== 'pending') throw new ConflictException('Solo se puede editar un hold pendiente');
      if (booking.expiresAt && booking.expiresAt.getTime() < Date.now()) {
        booking.status = 'expired';
        await this.bookings.save(booking as any);
        throw new ConflictException('La retención expiró');
      }
      const slot = booking.slot!;
      const inst = slot.instrument!;
      if (dto.partySize) booking.partySize = Math.max(1, Math.min(dto.partySize, inst.maxParty));
      if (dto.objectIds) {
        const objs = dto.objectIds.length
          ? await this.objects.find({ where: { id: In(dto.objectIds) } })
          : [];
        for (const o of objs) {
          const vis = evaluateVisibility(o, slot.date);
          if (!vis.visible) {
            throw new ConflictException({
              statusCode: 409,
              code: 'OBJECT_NOT_VISIBLE',
              objectId: o.id,
              message: `${o.name} no es visible esa noche.`,
            });
          }
        }
        await this.queue.delete({ bookingId: booking.id });
        let pos = 0;
        for (const o of objs) {
          await this.queue.save({
            bookingId: booking.id,
            objectId: o.id,
            position: pos,
            nowViewing: pos === 0,
          } as any);
          pos += 1;
        }
      }
      await this.lines.delete({ bookingId: booking.id });
      const addons =
        dto.addonIds && dto.addonIds.length
          ? await this.menu.find({ where: { id: In(dto.addonIds), active: true } })
          : [];
      await this.lines.save({
        bookingId: booking.id,
        kind: 'base',
        label: `${inst.name} × ${booking.partySize}`,
        quantity: booking.partySize,
        unitCents: inst.priceCents,
        amountCents: inst.priceCents * booking.partySize,
        menuItemId: null,
      } as any);
      for (const a of addons) {
        await this.lines.save({
          bookingId: booking.id,
          kind: 'addon',
          label: a.name,
          quantity: 1,
          unitCents: a.priceCents,
          amountCents: a.priceCents,
          menuItemId: a.id,
        } as any);
      }
      const fresh = await this.lines.find({ where: { bookingId: booking.id } });
      booking.totalCents = fresh.reduce((s, l) => s + l.amountCents, 0);
      await this.bookings.save(booking as any);
      return this.serialize(booking.id);
    });
  }

  async confirm(userId: string, id: string, _nonce: string) {
    return withLock(async () => {
      const pre = await this.bookings.findOne({ where: { id, userId } });
      if (!pre) throw new NotFoundException('Reserva no encontrada');
      if (pre.status === 'cancelled' || pre.status === 'expired') {
        throw new ConflictException('Retención expirada');
      }
      if (pre.expiresAt && pre.expiresAt.getTime() < Date.now()) {
        pre.status = 'expired';
        await this.bookings.save(pre as any);
        throw new ConflictException('La retención expiró');
      }
      if (pre.status !== 'pending') throw new ConflictException('Esta reserva ya no está pendiente');
      pre.status = 'confirmed';
      pre.confirmedAt = new Date();
      pre.expiresAt = null;
      await this.bookings.save(pre as any);
      const user = await this.users.findOne({ where: { id: userId } });
      await this.emails.save({
        userId,
        bookingId: pre.id,
        kind: 'ticket',
        toEmail: user?.email || '',
        body: `Ticket ${pre.code} confirmado. Muestra el QR en la cúpula.`,
      } as any);
      const out = await this.serialize(pre.id);
      return { ...out, code: pre.code, qrSvg: qrSvg(pre.code) };
    });
  }

  async cancel(userId: string, id: string, role: string) {
    const booking = await this.bookings.findOne({
      where: { id },
      relations: { slot: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.userId !== userId && role !== 'staff' && role !== 'admin') {
      throw new ForbiddenException();
    }
    if (booking.status === 'cancelled' || booking.status === 'expired') return this.serialize(id);
    if (booking.status === 'completed') throw new ConflictException('Ya está completada');
    if (booking.status === 'confirmed' || booking.status === 'checked_in') {
      const starts = booking.slot?.startsAt ? new Date(booking.slot.startsAt).getTime() : 0;
      const hours = (starts - Date.now()) / 3600000;
      if (hours < 24 && role !== 'staff' && role !== 'admin') {
        throw new ConflictException('Cancelación solo hasta 24 h antes');
      }
    }
    booking.status = 'cancelled';
    await this.bookings.save(booking as any);
    return this.serialize(id);
  }

  async listMine(userId: string, status?: string) {
    const where: any = { userId };
    if (status) where.status = status;
    const items = await this.bookings.find({
      where,
      relations: { slot: { instrument: true }, lines: true },
      order: { createdAt: 'DESC' },
    });
    return {
      items: items.map((b) => this.toListItem(b)),
      total: items.length,
    };
  }

  async getOne(userId: string, id: string, role: string) {
    const booking = await this.bookings.findOne({
      where: { id },
      relations: { slot: { instrument: true }, lines: true, queue: { object: true }, checkIn: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.userId !== userId && role !== 'staff' && role !== 'admin') {
      throw new ForbiddenException();
    }
    return this.serialize(id);
  }

  async complete(id: string) {
    const booking = await this.bookings.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.status !== 'checked_in' && booking.status !== 'confirmed') {
      throw new ConflictException('Solo se completa una noche check-in o confirmada');
    }
    booking.status = 'completed';
    await this.bookings.save(booking as any);
    const user = await this.users.findOne({ where: { id: booking.userId } });
    const awarded = POINTS_PER_PERSON * booking.partySize;
    if (user) {
      user.points = (user.points || 0) + awarded;
      await this.users.save(user as any);
    }
    return { booking: await this.reload(id), pointsAwarded: awarded };
  }

  async getQueue(id: string) {
    const entries = await this.queue.find({
      where: { bookingId: id },
      relations: { object: true },
      order: { position: 'ASC' },
    });
    return { entries };
  }

  async reorder(userId: string, id: string, orderedIds: string[], role: string) {
    const booking = await this.bookings.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.userId !== userId && role !== 'staff' && role !== 'admin') throw new ForbiddenException();
    if (booking.status !== 'checked_in') throw new ConflictException('La cola se reordena tras el check-in');
    const entries = await this.queue.find({ where: { bookingId: id } });
    const byObj = new Map(entries.map((e) => [e.objectId, e]));
    let pos = 0;
    for (const oid of orderedIds) {
      const e = byObj.get(oid);
      if (!e) continue;
      e.position = pos;
      await this.queue.save(e as any);
      pos += 1;
    }
    return this.getQueue(id);
  }

  async advance(userId: string, id: string, role: string) {
    const booking = await this.bookings.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.userId !== userId && role !== 'staff' && role !== 'admin') throw new ForbiddenException();
    if (booking.status !== 'checked_in') throw new ConflictException('Solo con check-in');
    const entries = await this.queue.find({ where: { bookingId: id }, order: { position: 'ASC' } });
    if (!entries.length) return { entries: [] };
    const current = entries.findIndex((e) => e.nowViewing);
    const next = current < 0 ? 0 : Math.min(current + 1, entries.length - 1);
    for (let i = 0; i < entries.length; i++) {
      entries[i].nowViewing = i === next;
      await this.queue.save(entries[i] as any);
    }
    return this.getQueue(id);
  }

  async checkIn(staffId: string, code: string) {
    const booking = await this.bookings.findOne({
      where: { code: code.trim().toUpperCase() },
      relations: { slot: { instrument: true }, lines: true, queue: { object: true }, checkIn: true },
    });
    if (!booking) throw new NotFoundException('Código no encontrado');
    if (booking.checkIn) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_CHECKED_IN',
        message: 'Este ticket ya se escaneó.',
      });
    }
    if (booking.status !== 'confirmed') {
      throw new ConflictException('Solo se hace check-in de reservas confirmadas');
    }
    const row = (await this.checkins.save({
      bookingId: booking.id,
      staffId,
      scannedAt: new Date(),
    } as any)) as CheckIn;
    booking.status = 'checked_in';
    await this.bookings.update({ id: booking.id }, { status: 'checked_in' });
    const first = await this.queue.find({ where: { bookingId: booking.id }, order: { position: 'ASC' } });
    if (first.length) {
      first[0].nowViewing = true;
      await this.queue.save(first[0] as any);
      for (let i = 1; i < first.length; i++) {
        first[i].nowViewing = false;
        await this.queue.save(first[i] as any);
      }
    }
    return { booking: await this.reload(booking.id), checkIn: row };
  }

  async listCheckIns(date?: string) {
    const rows = await this.checkins.find({ order: { scannedAt: 'DESC' } });
    if (!date) return { items: rows };
    const bookings = await this.bookings.find({
      where: { id: In(rows.map((r) => r.bookingId).concat(['__none__'])) },
      relations: { slot: true },
    });
    const byId = new Map(bookings.map((b) => [b.id, b]));
    return { items: rows.filter((r) => byId.get(r.bookingId)?.slot?.date === date) };
  }

  private toListItem(b: Booking) {
    const sum = (b.lines || []).reduce((s, l) => s + l.amountCents, 0);
    return {
      id: b.id,
      status: b.status,
      partySize: b.partySize,
      totalCents: sum || b.totalCents,
      code: b.code,
      expiresAt: b.expiresAt,
      confirmedAt: b.confirmedAt,
      createdAt: b.createdAt,
      slot: b.slot,
      instrument: b.slot?.instrument,
    };
  }

  private async reload(id: string) {
    return this.bookings.findOne({
      where: { id },
      relations: { slot: { instrument: true }, lines: true, queue: { object: true }, checkIn: true },
    });
  }

  async serialize(id: string) {
    const booking = await this.reload(id);
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    const lines = booking.lines || [];
    const totalCents = lines.reduce((s, l) => s + l.amountCents, 0);
    booking.totalCents = totalCents;
    return {
      booking: { ...booking, totalCents },
      lines,
      queue: (booking.queue || []).sort((a, b) => a.position - b.position),
      totalCents,
      expiresAt: booking.expiresAt,
      checkIn: booking.checkIn || null,
      qrSvg: booking.status !== 'pending' ? qrSvg(booking.code) : null,
      code: booking.code,
    };
  }
}
