import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from './entities/entities';
import { AuthModule } from './auth/auth.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { SlotsModule } from './slots/slots.module';
import { ObjectsModule } from './objects/objects.module';
import { BookingsModule } from './bookings/bookings.module';
import { MenuModule } from './menu/menu.module';
import { SocialModule } from './social/social.module';
import { StatsModule } from './stats/stats.module';
import { HealthModule } from './health/health.module';
import { SeedModule } from './seed/seed.module';
import { AccountModule } from './account/account.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = config.get<string>('DATABASE_TYPE', 'better-sqlite3');
        if (dbType === 'postgres') {
          return {
            type: 'postgres' as const,
            url: config.get<string>('DATABASE_URL'),
            entities: ALL_ENTITIES,
            synchronize: config.get('TYPEORM_SYNC', 'true') === 'true',
            ssl:
              config.get('DATABASE_SSL', 'true') === 'true'
                ? { rejectUnauthorized: false }
                : false,
          };
        }
        return {
          type: 'better-sqlite3' as const,
          database: config.get<string>('DATABASE_PATH', 'data/sextante.db'),
          entities: ALL_ENTITIES,
          synchronize: true,
        };
      },
    }),
    AuthModule,
    InstrumentsModule,
    SlotsModule,
    ObjectsModule,
    BookingsModule,
    MenuModule,
    SocialModule,
    StatsModule,
    HealthModule,
    AccountModule,
    SeedModule,
  ],
})
export class AppModule {}
