// app/components/ui/Modal.tsx
"use client";

import React, { useEffect, useRef, ReactNode } from "react";
import { X } from "lucide-react";

/* ===== Modal 타입 ===== */

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closable?: boolean;
  closeOnOverlayClick?: boolean;
};

/* ===== Modal 컴포넌트 ===== */

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closable = true,
  closeOnOverlayClick = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, closable, onClose]);

  // 모달 열릴 때 포커스
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        className={`
          relative w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl
          animate-modal-enter
          focus:outline-none
        `}
      >
        {/* Header */}
        {(title || closable) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            {title && (
              <h2 id="modal-title" className="text-lg font-bold text-slate-900">
                {title}
              </h2>
            )}
            {closable && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>

      {/* 애니메이션 스타일 (Tailwind에 없는 경우 대비) */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-modal-enter {
          animation: modal-enter 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

/* ===== ConfirmModal - 확인/취소 모달 ===== */

export type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning';
  loading?: boolean;
  icon?: ReactNode;
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
  icon,
}: ConfirmModalProps) {
  const variantStyles = {
    primary: {
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      buttonBg: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700',
      buttonShadow: 'shadow-indigo-500/25 hover:shadow-indigo-500/40',
    },
    danger: {
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      buttonBg: 'bg-rose-600 hover:bg-rose-700',
      buttonShadow: 'shadow-rose-500/25 hover:shadow-rose-500/40',
    },
    warning: {
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      buttonBg: 'bg-amber-500 hover:bg-amber-600',
      buttonShadow: 'shadow-amber-500/25 hover:shadow-amber-500/40',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closable={!loading}
      closeOnOverlayClick={!loading}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`
              px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              ${styles.buttonBg} ${styles.buttonShadow}
            `}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Posting...
              </span>
            ) : confirmText}
          </button>
        </div>
      }
    >
      <div className="text-center">
        {icon && (
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${styles.iconBg}`}>
            <div className={styles.iconColor}>
              {icon}
            </div>
          </div>
        )}
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          {title}
        </h3>
        <div className="text-sm text-slate-600">
          {message}
        </div>
      </div>
    </Modal>
  );
}
