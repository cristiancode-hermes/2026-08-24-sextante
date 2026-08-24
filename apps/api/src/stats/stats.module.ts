import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Booking, BookingLine } from '../entities/entities';
import { StatsController } from './stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, BookingLine]), AuthModule],
  controllers: [StatsController],
})
export class StatsModule {}
