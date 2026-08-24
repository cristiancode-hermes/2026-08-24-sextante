import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiBearerAuth } from '@nestjs/swagger';
import { EmailLog } from '../entities/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';

@Controller('account')
export class AccountController {
  constructor(@InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>) {}

  @Get('emails')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async list(@CurrentUser() user: { userId: string }) {
    const items = await this.emails.find({
      where: { userId: user.userId },
      order: { createdAt: 'DESC' },
    });
    return { items };
  }
}
