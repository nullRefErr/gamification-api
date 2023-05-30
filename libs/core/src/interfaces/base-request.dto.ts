export class BaseRequestDto<T> {
  body: T;
  client: { ip: string; };
  reqMeta: {
    reqId: string;
    service: string;
  };
}
