import {Module} from '@nestjs/common';

import {AppController} from './app.controller';
import {AppService} from './app.service';
import {GlobalConfigModule, GlobalMongoModule} from "@gamification-api/modules";

@Module({
  imports: [GlobalMongoModule, GlobalConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
}
