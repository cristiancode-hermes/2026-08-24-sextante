import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Instrument,
      NightSlot,
      CelestialObject,
      SkyNight,
      MenuItem,
      Booking,
      BookingLine,
      QueueEntry,
      CheckIn,
      Review,
      EmailLog,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
