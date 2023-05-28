export class BaseRequestDto<T> {
  data: T;
  reqMeta: {
    reqId: string;
    service: string;
  }
}
