import {Module} from '@nestjs/common';

import {AppController} from './app.controller';
import {AppService} from './app.service';
import {GlobalCacheModule, GlobalConfigModule, GlobalMongoModule} from "@gamification-api/modules";

@Module({
  imports: [GlobalMongoModule, GlobalConfigModule, GlobalCacheModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
}
