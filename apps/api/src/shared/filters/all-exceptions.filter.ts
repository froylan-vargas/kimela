import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger('ExceptionFilter') private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttp ? exception.getResponse() : null;

    const responseObj =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>)
        : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (responseObj?.message ?? 'Internal server error');

    const code = typeof responseObj?.code === 'string' ? responseObj.code : undefined;

    const logMessage = `${request.method} ${request.url} → ${status}: ${JSON.stringify(message)}`;

    if (status >= 500) {
      this.logger.error(
        { err: exception instanceof Error ? exception : new Error(String(exception)) },
        logMessage,
      );
    } else {
      this.logger.warn(logMessage);
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(code ? { code } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
