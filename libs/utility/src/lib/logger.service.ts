import {Injectable} from '@nestjs/common';
import pino from "pino";

@Injectable()
export class LoggerService {
  public static logger(params: { type: string; path: string; message: string; body?: any; error: any; }) {
    const adaptor = pino();
    return {
      fatal: adaptor.fatal(params),
      error: adaptor.error(params),
      warn: adaptor.warn(params),
      info: adaptor.info(params),
      debug: adaptor.debug(params),
      trace: adaptor.trace(params),
      silent: adaptor.silent(params),
    }
  }
}
