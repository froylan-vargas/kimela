import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

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
      this.logger.error(logMessage, exception instanceof Error ? exception.stack : undefined);
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
