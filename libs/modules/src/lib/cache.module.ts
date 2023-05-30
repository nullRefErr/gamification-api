import { Global, Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { GlobalConfigModule } from './config.module';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [GlobalConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        config: {
          url: config.get<string>('cache.url'),
          password: config.get<string>('cache.password'),
        },
      }),
    }),
  ],
  exports: [RedisModule],
})
export class GlobalCacheModule {}
