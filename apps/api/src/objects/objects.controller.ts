import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { ObjectsService } from './objects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, StaffGuard } from '../auth/current-user';

class ObjectDto {
  @IsString() slug!: string;
  @IsString() name!: string;
  @IsString() kind!: string;
  @IsArray() visibleMonths!: number[];
  @IsOptional() @IsInt() minAltitudeDeg?: number;
  @IsOptional() @IsBoolean() avoidFullMoon?: boolean;
  @IsOptional() @IsString() notes?: string;
}

class SkyDto {
  @IsString() status!: string;
  @IsOptional() @IsString() note?: string;
}

@ApiTags('objects')
@Controller()
export class ObjectsController {
  constructor(private readonly svc: ObjectsService) {}

  @Get('objects')
  list(@Query('date') date?: string, @Query('slotId') slotId?: string) {
    return this.svc.list(date, slotId);
  }

  @Get('objects/:id')
  getOne(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Post('objects')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  create(@Body() dto: ObjectDto) {
    return this.svc.create(dto as any);
  }

  @Patch('objects/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  update(@Param('id') id: string, @Body() dto: Partial<ObjectDto>) {
    return this.svc.update(id, dto as any);
  }

  @Get('sky')
  sky(@Query('date') date?: string) {
    return this.svc.getSky(date);
  }

  @Put('staff/sky/:date')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  putSky(
    @Param('date') date: string,
    @Body() dto: SkyDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.svc.putSky(date, dto.status, dto.note || '', user.userId);
  }
}
