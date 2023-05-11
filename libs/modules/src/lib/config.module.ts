import {Global, Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import config from '@gamification-api/config';

@Global()
@Module({
  imports: [ConfigModule.forRoot({isGlobal: true, load: [config]})],
  exports: [ConfigModule]
})
export class GlobalConfigModule {
}
