import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EmailLog } from '../entities/entities';
import { AccountController } from './account.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EmailLog]), AuthModule],
  controllers: [AccountController],
})
export class AccountModule {}
