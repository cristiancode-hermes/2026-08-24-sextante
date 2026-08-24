import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CelestialObject, NightSlot, SkyNight } from '../entities/entities';
import { evaluateVisibility, madridDate } from '../common/visibility';

@Injectable()
export class ObjectsService {
  constructor(
    @InjectRepository(CelestialObject) private readonly objects: Repository<CelestialObject>,
    @InjectRepository(NightSlot) private readonly slots: Repository<NightSlot>,
    @InjectRepository(SkyNight) private readonly skies: Repository<SkyNight>,
  ) {}

  async list(date?: string, slotId?: string) {
    let dateIso = date || madridDate();
    if (slotId) {
      const slot = await this.slots.findOne({ where: { id: slotId } });
      if (slot) dateIso = slot.date;
    }
    const items = await this.objects.find({ order: { name: 'ASC' } });
    return {
      items: items.map((object) => {
        const v = evaluateVisibility(object, dateIso);
        return { object, visible: v.visible, reason: v.reason };
      }),
      date: dateIso,
    };
  }

  async getOne(id: string) {
    const object = await this.objects.findOne({ where: { id } });
    if (!object) throw new NotFoundException('Objeto no encontrado');
    return { object };
  }

  async create(dto: Partial<CelestialObject>) {
    const object = (await this.objects.save(dto as any)) as CelestialObject;
    return { object };
  }

  async update(id: string, dto: Partial<CelestialObject>) {
    const object = await this.objects.findOne({ where: { id } });
    if (!object) throw new NotFoundException('Objeto no encontrado');
    Object.assign(object, dto);
    return { object: (await this.objects.save(object as any)) as CelestialObject };
  }

  async getSky(date?: string) {
    const dateIso = date || madridDate();
    const sky = await this.skies.findOne({ where: { date: dateIso } });
    return {
      sky: sky || { date: dateIso, status: 'open', note: '', updatedById: null },
    };
  }

  async putSky(date: string, status: string, note: string, userId: string) {
    let sky = await this.skies.findOne({ where: { date } });
    if (!sky) {
      sky = (await this.skies.save({
        date,
        status,
        note: note || '',
        updatedById: userId,
        updatedAt: new Date(),
      } as any)) as SkyNight;
    } else {
      sky.status = status as any;
      sky.note = note || '';
      sky.updatedById = userId;
      sky.updatedAt = new Date();
      sky = (await this.skies.save(sky as any)) as SkyNight;
    }
    return { sky };
  }
}
