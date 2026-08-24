import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking, Instrument, NightSlot, Review } from '../entities/entities';
import { LIVE_STATUSES } from '../entities/entities';
import { madridDate, sortNightSlots } from '../common/visibility';

@Injectable()
export class InstrumentsService {
  constructor(
    @InjectRepository(Instrument) private readonly instruments: Repository<Instrument>,
    @InjectRepository(NightSlot) private readonly slots: Repository<NightSlot>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  async list(q?: string, type?: string, date?: string) {
    const dateIso = date || madridDate();
    let items = await this.instruments.find({ where: { active: true }, order: { name: 'ASC' } });
    if (type) items = items.filter((i) => i.type === type);
    if (q) {
      const n = q.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(n) || i.slug.toLowerCase().includes(n),
      );
    }
    const decorated = await this.decorate(items, dateIso);
    const freeSlotsToday = decorated.reduce((s, i) => s + i.freeSlotsToday, 0);
    return { items: decorated, total: decorated.length, freeSlotsToday };
  }

  async featured(date?: string) {
    const dateIso = date || madridDate();
    const items = await this.instruments.find({ where: { active: true }, order: { name: 'ASC' } });
    const decorated = await this.decorate(items.slice(0, 4), dateIso);
    const freeSlotsToday = decorated.reduce((s, i) => s + i.freeSlotsToday, 0);
    return { items: decorated, freeSlotsToday };
  }

  async getOne(id: string) {
    const instrument = await this.instruments.findOne({ where: { id } });
    if (!instrument) throw new NotFoundException('Cúpula no encontrada');
    const revs = await this.reviews.find({ where: { instrumentId: id } });
    const ratingCount = revs.length;
    const ratingAvg = ratingCount
      ? Math.round((revs.reduce((s, r) => s + r.rating, 0) / ratingCount) * 10) / 10
      : 0;
    return { instrument, ratingAvg, ratingCount };
  }

  async create(dto: Partial<Instrument>) {
    return (await this.instruments.save(dto as any)) as Instrument;
  }

  async update(id: string, dto: Partial<Instrument>) {
    const inst = await this.instruments.findOne({ where: { id } });
    if (!inst) throw new NotFoundException('Cúpula no encontrada');
    Object.assign(inst, dto);
    return (await this.instruments.save(inst as any)) as Instrument;
  }

  async softDelete(id: string) {
    const inst = await this.instruments.findOne({ where: { id } });
    if (!inst) throw new NotFoundException('Cúpula no encontrada');
    inst.active = false;
    await this.instruments.save(inst as any);
    return { ok: true };
  }

  private async decorate(items: Instrument[], dateIso: string) {
    if (!items.length) return [];
    const ids = items.map((i) => i.id);
    const slots = await this.slots.find({ where: { instrumentId: In(ids), date: dateIso } });
    const live = await this.bookings.find({
      where: { slotId: In(slots.map((s) => s.id).concat(['__none__'])), status: In(LIVE_STATUSES) },
    });
    const taken = new Set(live.map((b) => b.slotId));
    return items.map((inst) => {
      const mine = slots.filter((s) => s.instrumentId === inst.id && !s.blocked);
      const free = mine.filter((s) => !taken.has(s.id)).length;
      return { ...inst, freeSlotsToday: free };
    });
  }
}
