import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Booking, BookingLine } from '../entities/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';
import { addDaysIso, madridDate } from '../common/visibility';

@ApiTags('stats')
@Controller('staff/stats')
export class StatsController {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  async stats(@Query('from') from?: string, @Query('to') to?: string) {
    const today = madridDate();
    const start = from || addDaysIso(today, -6);
    const end = to || today;
    const all = await this.bookings.find({ relations: { slot: true, lines: true } });
    const inRange = all.filter((b) => b.slot && b.slot.date >= start && b.slot.date <= end);
    const paid = inRange.filter((b) =>
      ['confirmed', 'checked_in', 'completed'].includes(b.status),
    );
    const revenue = paid.reduce((s, b) => {
      const sum = (b.lines || []).reduce((a, l) => a + l.amountCents, 0);
      return s + (sum || b.totalCents);
    }, 0);
    const nights = paid.reduce((s, b) => s + 1, 0);
    const guests = paid.reduce((s, b) => s + b.partySize, 0);
    const series: { date: string; occupancy: number; revenueCents: number }[] = [];
    let cursor = start;
    while (cursor <= end) {
      const day = paid.filter((b) => b.slot!.date === cursor);
      series.push({
        date: cursor,
        occupancy: day.length,
        revenueCents: day.reduce((s, b) => {
          const sum = (b.lines || []).reduce((a, l) => a + l.amountCents, 0);
          return s + (sum || b.totalCents);
        }, 0),
      });
      cursor = addDaysIso(cursor, 1);
    }
    return {
      kpis: {
        nights,
        guests,
        revenueCents: revenue,
        occupancyAvg: series.length ? Math.round((nights / series.length) * 10) / 10 : 0,
      },
      series,
    };
  }
}
