// app/components/ui/index.tsx
"use client";

import React, { ReactNode } from "react";

// Re-export skeleton components
export { 
  Skeleton, 
  ReviewCardSkeleton, 
  ReviewListSkeleton, 
  DetailPanelSkeleton,
  SettingsCardSkeleton,
  SettingsPageSkeleton 
} from "./Skeleton";

/* ===== PageHeader ===== */
type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/* ===== StatCard ===== */
type StatCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
};

export function StatCard({ label, value, icon, trend, className = "" }: StatCardProps) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300 ${className}`}>
      {/* 배경 그라데이션 효과 */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 opacity-50 transition-transform group-hover:scale-110" />
      
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">{label}</span>
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              {icon}
            </div>
          )}
        </div>
        
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">{value}</span>
          {trend && (
            <span className={`text-sm font-medium ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== AppCard ===== */
type AppCardProps = {
  children: ReactNode;
  hover?: boolean;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
};

export function AppCard({ children, hover = false, onClick, className = "", selected = false }: AppCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl border bg-white transition-all
        ${hover ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : 'shadow-sm'}
        ${selected ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/* ===== SectionTitle ===== */
type SectionTitleProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function SectionTitle({ title, subtitle, action }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/* ===== StatusBadge - 가시성 강화 버전 ===== */
type BadgeStatus = 'new' | 'pending' | 'replied' | 'approved' | 'warning' | 'success' | 'info';

type StatusBadgeProps = {
  status: BadgeStatus;
  label?: string;
  size?: 'sm' | 'md';
};

const badgeStyles: Record<BadgeStatus, { bg: string; text: string; dot: string }> = {
  new: {
    bg: 'bg-violet-100 border-violet-300',
    text: 'text-violet-800',
    dot: 'bg-violet-500',
  },
  pending: {
    bg: 'bg-amber-100 border-amber-300',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
  },
  replied: {
    bg: 'bg-sky-100 border-sky-300',
    text: 'text-sky-800',
    dot: 'bg-sky-500',
  },
  approved: {
    bg: 'bg-emerald-100 border-emerald-300',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-orange-100 border-orange-300',
    text: 'text-orange-800',
    dot: 'bg-orange-500',
  },
  success: {
    bg: 'bg-green-100 border-green-300',
    text: 'text-green-800',
    dot: 'bg-green-500',
  },
  info: {
    bg: 'bg-blue-100 border-blue-300',
    text: 'text-blue-800',
    dot: 'bg-blue-500',
  },
};

const badgeLabels: Record<BadgeStatus, string> = {
  new: 'New',
  pending: 'Pending',
  replied: 'Replied',
  approved: 'Approved',
  warning: 'Warning',
  success: 'Success',
  info: 'Info',
};

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const style = badgeStyles[status];
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px]' 
    : 'px-2.5 py-1 text-xs';
  const dotSize = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2';
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-bold shadow-sm ${style.bg} ${style.text} ${sizeClasses}`}>
      <span className={`rounded-full ${style.dot} ${dotSize} animate-pulse`} />
      {label || badgeLabels[status]}
    </span>
  );
}

/* ===== RatingStars - 가시성 강화 버전 ===== */
type RatingStarsProps = {
  rating: number | null;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
};

export function RatingStars({ rating, size = 'md', showValue = false }: RatingStarsProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  if (rating === null) {
    return <span className="text-slate-400 text-sm">No rating</span>;
  }

  return (
    <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`
              ${star <= rating 
                ? 'text-amber-400 drop-shadow-sm' 
                : 'text-slate-300'
              }
            `}
          >
            ★
          </span>
        ))}
      </div>
      {showValue && (
        <span className="ml-1 text-sm font-semibold text-slate-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

/* ===== SourceBadge - 가시성 강화 버전 ===== */
type SourceBadgeProps = {
  source: string | null;
  showLabel?: boolean;
};

export function SourceBadge({ source, showLabel = true }: SourceBadgeProps) {
  if (!source) return null;

  const config: Record<string, { gradient: string; icon: string; label: string }> = {
    google: {
      gradient: 'bg-gradient-to-r from-blue-500 to-green-500 shadow-blue-500/30',
      icon: 'G',
      label: 'Google',
    },
    yelp: {
      gradient: 'bg-gradient-to-r from-red-500 to-rose-500 shadow-red-500/30',
      icon: 'Y',
      label: 'Yelp',
    },
    facebook: {
      gradient: 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/30',
      icon: 'f',
      label: 'Facebook',
    },
  };

  const normalizedSource = source.toLowerCase();
  const sourceConfig = config[normalizedSource] || {
    gradient: 'bg-slate-500',
    icon: source.charAt(0).toUpperCase(),
    label: source,
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white shadow-lg ${sourceConfig.gradient}`}>
        {sourceConfig.icon}
      </div>
      {showLabel && (
        <span className="text-sm font-semibold text-slate-700">
          {sourceConfig.label}
        </span>
      )}
    </div>
  );
}

/* ===== Button ===== */
type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit';
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 focus:ring-indigo-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40',
    secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-500 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-500',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-lg shadow-rose-500/25',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

/* ===== EmptyState ===== */
type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ===== Avatar ===== */
type AvatarProps = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div className={`flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white shadow-lg shadow-indigo-500/30 ${sizes[size]} ${className}`}>
      {initial}
    </div>
  );
}

/* ===== Input ===== */
type InputProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number';
  error?: string;
  disabled?: boolean;
  className?: string;
};

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
  disabled = false,
  className = '',
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 rounded-xl border bg-white text-slate-900 placeholder-slate-400
          transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          disabled:bg-slate-50 disabled:cursor-not-allowed
          ${error ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200'}
        `}
      />
      {error && <p className="mt-1.5 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

/* ===== Toggle ===== */
type ToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
};

export function Toggle({ enabled, onChange, label, description, disabled = false }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      {(label || description) && (
        <div className="flex-1">
          {label && <span className="text-sm font-medium text-slate-900">{label}</span>}
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${enabled ? 'bg-indigo-600' : 'bg-slate-200'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${enabled ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

/* ===== AIReadyBadge - 새 컴포넌트 ===== */
type AIReadyBadgeProps = {
  ready: boolean;
  size?: 'sm' | 'md';
};

export function AIReadyBadge({ ready, size = 'md' }: AIReadyBadgeProps) {
  if (!ready) return null;
  
  const sizeClasses = size === 'sm' 
    ? 'text-xs gap-1' 
    : 'text-sm gap-1.5';
  
  return (
    <div className={`inline-flex items-center font-semibold text-emerald-600 ${sizeClasses}`}>
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span>AI Ready</span>
    </div>
  );
}
