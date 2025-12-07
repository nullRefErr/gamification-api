import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Account } from '../schemas/account.schema';

/**
 * Custom decorator to extract current account from request
 * Usage: @CurrentAccount() account: Account
 */
export const CurrentAccount = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Account => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
