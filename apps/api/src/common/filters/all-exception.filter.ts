import {
  ExceptionFilter,
  Catch,
  Logger,
  HttpException,
  HttpStatus,
  ArgumentsHost,
} from '@nestjs/common';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  #logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as { message: string }).message ||
          JSON.stringify(exceptionResponse)
        : (exception as Error).message || HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      timeStamp: new Date().toISOString(),
      path: request.url,
    };

    this.#logger.error(
      `HTTP Status: ${status} ERROR: ${JSON.stringify(errorResponse)}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json(errorResponse);
  }
}
