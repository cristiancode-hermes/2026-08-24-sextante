import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking, Instrument, NightSlot, SkyNight } from '../entities/entities';
import { LIVE_STATUSES } from '../entities/entities';
import { madridStartsAt, NIGHT_TIMES, sortNightSlots } from '../common/visibility';

@Injectable()
export class SlotsService {
  constructor(
    @InjectRepository(NightSlot) private readonly slots: Repository<NightSlot>,
    @InjectRepository(Instrument) private readonly instruments: Repository<Instrument>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(SkyNight) private readonly skies: Repository<SkyNight>,
  ) {}

  async listForInstrument(instrumentId: string, date: string) {
    const inst = await this.instruments.findOne({ where: { id: instrumentId } });
    if (!inst) throw new NotFoundException('Cúpula no encontrada');
    const slots = sortNightSlots(
      await this.slots.find({ where: { instrumentId, date } }),
    );
    const live = await this.bookings.find({
      where: { slotId: In(slots.map((s) => s.id).concat(['__none__'])), status: In(LIVE_STATUSES) },
    });
    const taken = new Set(live.map((b) => b.slotId));
    const sky = (await this.skies.findOne({ where: { date } })) || {
      date,
      status: 'open',
      note: '',
    };
    return {
      slots: slots.map((s) => ({
        ...s,
        instrument: inst,
        taken: taken.has(s.id) || s.blocked,
        status: s.blocked ? 'blocked' : taken.has(s.id) ? 'busy' : 'free',
      })),
      sky,
    };
  }

  async getOne(id: string) {
    const slot = await this.slots.findOne({ where: { id }, relations: { instrument: true } });
    if (!slot) throw new NotFoundException('Franja no encontrada');
    const sky = (await this.skies.findOne({ where: { date: slot.date } })) || {
      date: slot.date,
      status: 'open',
      note: '',
    };
    const live = await this.bookings.findOne({
      where: { slotId: id, status: In(LIVE_STATUSES) },
    });
    return { slot, instrument: slot.instrument, sky, taken: !!live };
  }

  async generate(instrumentId: string, date: string, times?: string[]) {
    const inst = await this.instruments.findOne({ where: { id: instrumentId } });
    if (!inst) throw new NotFoundException('Cúpula no encontrada');
    const list = times && times.length ? times : NIGHT_TIMES;
    let created = 0;
    for (const startTime of list) {
      const exists = await this.slots.findOne({ where: { instrumentId, date, startTime } });
      if (exists) continue;
      await this.slots.save({
        instrumentId,
        date,
        startTime,
        durationMin: 60,
        blocked: false,
        startsAt: madridStartsAt(date, startTime),
      } as any);
      created += 1;
    }
    return { created };
  }

  async block(id: string, blocked: boolean) {
    const slot = await this.slots.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Franja no encontrada');
    const live = await this.bookings.findOne({
      where: { slotId: id, status: In(LIVE_STATUSES) },
    });
    if (blocked && live) throw new ConflictException('Hay una reserva viva en esta franja');
    slot.blocked = blocked;
    return (await this.slots.save(slot as any)) as NightSlot;
  }
}
