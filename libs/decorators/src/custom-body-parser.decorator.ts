import {createParamDecorator, ExecutionContext} from '@nestjs/common';

export const CustomBodyParser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      body: request.body,
      reqMeta: request.reqMeta,
      client: request.clientMeta,
    };
  },
);
