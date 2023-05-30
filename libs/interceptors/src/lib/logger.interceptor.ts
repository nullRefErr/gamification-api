import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {LoggerService} from '@gamification-api/utility';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const headers = request.headers;
    const reqId = headers['x-api-req-id'];

    LoggerService.logger().info({
      type: 'REQUEST',
      reqId,
      path: request.path,
      body: request.body,
    });

    const now = Date.now();
    return next.handle().pipe(
      tap((response) => {
        LoggerService.logger().info({
          type: 'RESPONSE',
          reqId,
          path: request.path,
          body: response,
          reqTimeMS: Date.now() - now,
        });
      })
    );
  }
}
