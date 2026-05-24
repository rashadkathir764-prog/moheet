import axios from 'axios';

/**
 * يستخرج رسالة خطأ مفهومة من أي نوع خطأ.
 *
 * الأولوية:
 * 1. error.response.data.message (من الـ Backend)
 * 2. error.message (من JS/Network)
 * 3. رسالة عربية افتراضية
 *
 * TODO: استبدل logger.error بـ Sentry.captureException في الإنتاج
 */
export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;

    if (data?.message) {
      // NestJS يرجع أحياناً message كـ array عند ValidationPipe
      if (Array.isArray(data.message)) {
        return data.message[0] ?? 'حدث خطأ في الخادم';
      }
      return data.message;
    }

    // خطأ شبكة (لا يوجد response)
    if (!error.response) {
      return 'تعذّر الاتصال بالخادم، تحقق من اتصال الإنترنت';
    }

    // أخطاء HTTP معروفة
    if (error.response.status === 401) return 'يجب تسجيل الدخول أولاً';
    if (error.response.status === 403) return 'ليس لديك صلاحية لهذا الإجراء';
    if (error.response.status === 404) return 'العنصر المطلوب غير موجود';
    if (error.response.status >= 500) return 'حدث خطأ في الخادم، حاول مجدداً لاحقاً';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'حدث خطأ غير متوقع، حاول مجدداً';
}

/**
 * Logger بسيط — يُطبع فقط في التطوير.
 * في الإنتاج يمكن ربطه بـ Sentry.captureException.
 *
 * TODO: استبدل بـ Sentry.captureException(error) في الإنتاج
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
  // TODO: Sentry.captureException(error, { tags: { context } });
}

/**
 * يقوم بحل وتصحيح روابط الصور المرفوعة محلياً.
 * يتعامل مع الروابط النسبية (التي تبدأ بـ /uploads) وعناوين localhost:3001
 * ويقوم بتحويلها تلقائياً للمنفذ والمسار الصحيح.
 */
export function resolveImageUrl(url?: string): string {
  if (!url) return '';
  let resolved = url;
  const base = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api/v1';
  const origin = (() => {
    try {
      return new URL(base).origin;
    } catch {
      return 'http://127.0.0.1:3000';
    }
  })();

  // استبدال المنفذ القديم 3001 بالمنفذ الفعلي 3000 ليتوافق مع التشغيل المحلي
  if (resolved.includes('localhost:3001')) {
    resolved = resolved.replace('localhost:3001', origin.replace('http://', '').replace('https://', ''));
  }

  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    return resolved;
  }

  // إلحاق عنوان الأصل إذا كان الرابط نسبياً
  return `${origin}${resolved.startsWith('/') ? '' : '/'}${resolved}`;
}
