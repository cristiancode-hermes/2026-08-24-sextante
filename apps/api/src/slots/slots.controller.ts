import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { SlotsService } from './slots.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';

class GenerateDto {
  @IsString() date!: string;
  @IsOptional() @IsArray() times?: string[];
}

class BlockDto {
  @IsBoolean() blocked!: boolean;
}

@ApiTags('slots')
@Controller()
export class SlotsController {
  constructor(private readonly svc: SlotsService) {}

  @Get('instruments/:instrumentId/slots')
  list(@Param('instrumentId') instrumentId: string, @Query('date') date: string) {
    return this.svc.listForInstrument(instrumentId, date);
  }

  @Get('slots/:id')
  getOne(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Post('instruments/:instrumentId/slots/generate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  generate(@Param('instrumentId') instrumentId: string, @Body() dto: GenerateDto) {
    return this.svc.generate(instrumentId, dto.date, dto.times);
  }

  @Patch('slots/:id/block')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  block(@Param('id') id: string, @Body() dto: BlockDto) {
    return this.svc.block(id, dto.blocked).then((slot) => ({ slot }));
  }
}
