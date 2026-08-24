import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Booking, Favorite, Review } from '../entities/entities';
import { SocialController } from './social.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Booking, Favorite]), AuthModule],
  controllers: [SocialController],
})
export class SocialModule {}
