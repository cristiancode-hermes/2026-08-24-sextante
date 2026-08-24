import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import {
  Booking,
  BookingLine,
  CelestialObject,
  CheckIn,
  EmailLog,
  MenuItem,
  NightSlot,
  QueueEntry,
  SkyNight,
  User,
} from '../entities/entities';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingLine,
      QueueEntry,
      NightSlot,
      CelestialObject,
      MenuItem,
      SkyNight,
      User,
      CheckIn,
      EmailLog,
    ]),
    AuthModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
