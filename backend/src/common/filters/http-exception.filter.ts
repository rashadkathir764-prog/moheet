import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isDev = process.env.NODE_ENV !== 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveError(exception);

    // ─── تسجيل الخطأ في وضع التطوير ─────────────────────────────────────────
    if (this.isDev) {
      this.logger.error(
        `[${request.method}] ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      // في الإنتاج: نسجّل ملخصاً فقط بدون stack trace
      this.logger.error(
        `[${request.method}] ${request.url} → ${statusCode}: ${message}`,
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── تحليل نوع الخطأ وإرجاع بيانات موحدة ────────────────────────────────
  private resolveError(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
  } {
    // 1️⃣ HttpException (يشمل ValidationPipe، NotFoundException، إلخ)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();

      let message: string;
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (
        typeof responseBody === 'object' &&
        responseBody !== null &&
        'message' in responseBody
      ) {
        const raw = (responseBody as Record<string, unknown>).message;
        // ValidationPipe يُرجع مصفوفة من الأخطاء
        message = Array.isArray(raw) ? raw.join(', ') : String(raw);
      } else {
        message = exception.message;
      }

      return {
        statusCode: status,
        message,
        error: this.httpStatusText(status),
      };
    }

    // 2️⃣ TypeORM QueryFailedError
    if (exception instanceof QueryFailedError) {
      const driverError = (exception as QueryFailedError & { driverError?: { code?: string } })
        .driverError;

      // خطأ تعارض المفتاح الأساسي (unique constraint)
      if (driverError?.code === '23505') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'البيانات موجودة مسبقاً أو تعارض في القيم الفريدة.',
          error: 'Conflict',
        };
      }

      // خطأ انتهاك مفتاح أجنبي
      if (driverError?.code === '23503') {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'البيانات المرتبطة غير موجودة.',
          error: 'Bad Request',
        };
      }

      // أي خطأ TypeORM آخر
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: this.isDev
          ? `Database error: ${exception.message}`
          : 'حدث خطأ في قاعدة البيانات. يرجى المحاولة لاحقاً.',
        error: 'Internal Server Error',
      };
    }

    // 3️⃣ أي خطأ غير متوقع
    const unknownMessage =
      this.isDev && exception instanceof Error
        ? exception.message
        : 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة لاحقاً.';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: unknownMessage,
      error: 'Internal Server Error',
    };
  }

  // ─── نص حالة HTTP قابل للقراءة ───────────────────────────────────────────
  private httpStatusText(status: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      408: 'Request Timeout',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return map[status] ?? 'Error';
  }
}
