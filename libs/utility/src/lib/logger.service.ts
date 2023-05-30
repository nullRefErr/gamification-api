import { Injectable } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggerService {
  public static logger() {
    const adaptor = pino();
    return adaptor;
  }
}
