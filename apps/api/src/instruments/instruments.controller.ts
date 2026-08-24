import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { InstrumentsService } from './instruments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';

class InstrumentDto {
  @IsString() slug!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() type?: string;
  @IsInt() apertureMm!: number;
  @IsString() mount!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsInt() priceCents!: number;
  @IsOptional() @IsInt() maxParty?: number;
}

class PatchInstrumentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsInt() priceCents?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

@ApiTags('instruments')
@Controller()
export class InstrumentsController {
  constructor(private readonly svc: InstrumentsService) {}

  @Get('instruments')
  list(@Query('q') q?: string, @Query('type') type?: string, @Query('date') date?: string) {
    return this.svc.list(q, type, date);
  }

  @Get('instruments/featured')
  featured(@Query('date') date?: string) {
    return this.svc.featured(date);
  }

  @Get('instruments/:id')
  getOne(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Post('instruments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  create(@Body() dto: InstrumentDto) {
    return this.svc.create(dto as any).then((instrument) => ({ instrument }));
  }

  @Patch('instruments/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  update(@Param('id') id: string, @Body() dto: PatchInstrumentDto) {
    return this.svc.update(id, dto as any).then((instrument) => ({ instrument }));
  }

  @Delete('instruments/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  remove(@Param('id') id: string) {
    return this.svc.softDelete(id);
  }
}
