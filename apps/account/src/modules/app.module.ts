import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalConfigModule } from '@gamification-api/modules';
import { AccountModule } from './account.module';

@Module({
  imports: [
    // Global Configuration
    GlobalConfigModule,

    // Database Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/gamification',
      }),
      inject: [ConfigService],
    }),

    // Account Module with all schemas and services
    AccountModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
