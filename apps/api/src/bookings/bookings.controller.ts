import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, StaffGuard } from '../auth/current-user';

class HoldDto {
  @IsString() slotId!: string;
  @IsInt() @Min(1) partySize!: number;
  @IsArray() objectIds!: string[];
  @IsOptional() @IsArray() addonIds?: string[];
}

class PatchHoldDto {
  @IsOptional() @IsInt() @Min(1) partySize?: number;
  @IsOptional() @IsArray() objectIds?: string[];
  @IsOptional() @IsArray() addonIds?: string[];
}

class ConfirmDto {
  @IsOptional() @IsString() paymentNonce?: string;
}

class QueueDto {
  @IsArray() @ArrayMinSize(1) orderedIds!: string[];
}

@ApiTags('bookings')
@Controller()
export class BookingsController {
  constructor(private readonly svc: BookingsService) {}

  @Post('bookings/hold')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  hold(@Body() dto: HoldDto, @CurrentUser() user: { userId: string }) {
    return this.svc.hold(user.userId, dto);
  }

  @Patch('bookings/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  patch(@Param('id') id: string, @Body() dto: PatchHoldDto, @CurrentUser() user: { userId: string }) {
    return this.svc.updateHold(user.userId, id, dto);
  }

  @Post('bookings/:id/confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  confirm(@Param('id') id: string, @Body() dto: ConfirmDto, @CurrentUser() user: { userId: string }) {
    return this.svc.confirm(user.userId, id, dto.paymentNonce || 'demo');
  }

  @Post('bookings/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @CurrentUser() user: { userId: string; role: string }) {
    return this.svc.cancel(user.userId, id, user.role);
  }

  @Get('bookings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  list(@Query('status') status: string | undefined, @CurrentUser() user: { userId: string }) {
    return this.svc.listMine(user.userId, status);
  }

  @Get('bookings/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  one(@Param('id') id: string, @CurrentUser() user: { userId: string; role: string }) {
    return this.svc.getOne(user.userId, id, user.role);
  }

  @Post('bookings/:id/complete')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  complete(@Param('id') id: string) {
    return this.svc.complete(id);
  }

  @Get('bookings/:id/queue')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  queue(@Param('id') id: string) {
    return this.svc.getQueue(id);
  }

  @Patch('bookings/:id/queue')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  reorder(
    @Param('id') id: string,
    @Body() dto: QueueDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.svc.reorder(user.userId, id, dto.orderedIds, user.role);
  }

  @Post('bookings/:id/queue/advance')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  advance(@Param('id') id: string, @CurrentUser() user: { userId: string; role: string }) {
    return this.svc.advance(user.userId, id, user.role);
  }

  @Post('staff/check-in')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  checkIn(@Body() body: { code: string }, @CurrentUser() user: { userId: string }) {
    return this.svc.checkIn(user.userId, body.code);
  }

  @Get('staff/check-ins')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  checkIns(@Query('date') date?: string) {
    return this.svc.listCheckIns(date);
  }
}
