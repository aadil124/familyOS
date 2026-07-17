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
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Exception on ${request.url}`, exception instanceof Error ? exception.stack : '');
    }

    const extractMessage = (msg: unknown): string => {
      if (typeof msg === 'string') return msg;
      if (msg && typeof msg === 'object' && 'message' in msg) {
        const nestedMessage = (msg as { message: unknown }).message;
        if (Array.isArray(nestedMessage)) return nestedMessage.join(', ');
        if (typeof nestedMessage === 'string') return nestedMessage;
      }
      return 'Internal server error';
    };

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: extractMessage(message),
    };

    response.status(status).json(errorResponse);
  }
}
