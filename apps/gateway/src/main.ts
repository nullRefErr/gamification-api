/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import {Logger} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';

import {AppModule} from './app/app.module';
import {LoggerInterceptor} from '@gamification-api/interceptors';
import {clientMetaMiddleware, reqMetaMiddleware, methodFilterMiddleware} from '@gamification-api/middlewares';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  app.use(methodFilterMiddleware, clientMetaMiddleware, reqMetaMiddleware);
  app.useGlobalInterceptors(new LoggerInterceptor());

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
