import {Global, Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {GlobalConfigModule} from "./config.module";
import {ConfigService} from "@nestjs/config";

@Global()
@Module({
  imports: [MongooseModule.forRootAsync({
    imports: [GlobalConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      uri: config.get<string>('database.uri'),
      dbName: config.get<string>('database.name'),
    }),
  })],
  exports: [MongooseModule]
})
export class GlobalMongoModule {
}
