import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Booking, Favorite, Review } from '../entities/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';

class ReviewDto {
  @IsString() bookingId!: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() comment?: string;
}

class FavDto {
  @IsString() instrumentId!: string;
}

@ApiTags('social')
@Controller()
export class SocialController {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Favorite) private readonly favs: Repository<Favorite>,
  ) {}

  @Post('reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createReview(@Body() dto: ReviewDto, @CurrentUser() user: { userId: string }) {
    const booking = await this.bookings.findOne({
      where: { id: dto.bookingId },
      relations: { slot: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.userId !== user.userId) throw new ForbiddenException();
    if (booking.status !== 'completed') throw new BadRequestException('Solo tras completar la noche');
    const exists = await this.reviews.findOne({ where: { bookingId: booking.id } });
    if (exists) throw new BadRequestException('Ya hay reseña');
    const review = (await this.reviews.save({
      bookingId: booking.id,
      userId: user.userId,
      instrumentId: booking.slot!.instrumentId,
      rating: dto.rating,
      comment: dto.comment || null,
    } as any)) as Review;
    return { review };
  }

  @Get('instruments/:id/reviews')
  async listReviews(@Param('id') id: string) {
    const items = await this.reviews.find({ where: { instrumentId: id }, order: { createdAt: 'DESC' } });
    const avg = items.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : 0;
    return { items, avg: Math.round(avg * 10) / 10 };
  }

  @Post('favorites')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async addFav(@Body() dto: FavDto, @CurrentUser() user: { userId: string }) {
    const favorite = (await this.favs.save({
      userId: user.userId,
      instrumentId: dto.instrumentId,
    } as any)) as Favorite;
    return { favorite };
  }

  @Delete('favorites/:instrumentId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async delFav(@Param('instrumentId') instrumentId: string, @CurrentUser() user: { userId: string }) {
    await this.favs.delete({ userId: user.userId, instrumentId });
    return { ok: true };
  }

  @Get('favorites')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async listFavs(@CurrentUser() user: { userId: string }) {
    const items = await this.favs.find({ where: { userId: user.userId } });
    return { items };
  }
}
