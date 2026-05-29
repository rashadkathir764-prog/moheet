import React, { useEffect } from 'react';

/**
 * AppDialog — مكون مودال صغير وقابل لإعادة الاستخدام يستبدل
 * window.alert و window.confirm بطريقة آمنة وقابلة للتنسيق RTL.
 *
 * - استخدام confirm: مرّر cancelText + onCancel + onConfirm.
 * - استخدام info/alert: مرّر confirmText (افتراضياً "حسناً") + onConfirm فقط.
 * - variant="danger" يجعل زر التأكيد أحمر (مناسب للحذف).
 * - يدعم Esc + النقر خارج البطاقة لإغلاق الحوار.
 * - بدون أي package جديد. اعتماد فقط على React.
 */

export type AppDialogVariant = 'danger' | 'info';

export interface AppDialogProps {
  isOpen: boolean;
  title?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  variant?: AppDialogVariant;
}

export const AppDialog: React.FC<AppDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'حسناً',
  cancelText,
  onConfirm,
  onCancel,
  variant = 'info',
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (onCancel) onCancel();
        else if (onConfirm) onConfirm();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  const confirmBackground = variant === 'danger' ? '#c62828' : '#0f1111';
  const titleColor = variant === 'danger' ? '#b91c1c' : '#0f172a';

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (onCancel) onCancel();
    else if (onConfirm) onConfirm();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'app-dialog-title' : undefined}
      dir="rtl"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          maxWidth: '420px',
          width: '100%',
          padding: '20px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)',
          fontFamily: 'inherit',
          color: '#0f172a',
        }}
      >
        {title && (
          <h2
            id="app-dialog-title"
            style={{
              margin: '0 0 10px',
              fontSize: '17px',
              fontWeight: 700,
              color: titleColor,
            }}
          >
            {title}
          </h2>
        )}
        {message && (
          <div
            style={{
              fontSize: '14px',
              lineHeight: 1.7,
              color: '#334155',
              marginBottom: '18px',
              whiteSpace: 'pre-line',
            }}
          >
            {message}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          {cancelText && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button
              type="button"
              autoFocus
              onClick={onConfirm}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: confirmBackground,
                color: '#ffffff',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppDialog;
