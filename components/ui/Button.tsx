import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'on-dark' | 'on-dark-solid';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-ink-soft text-white hover:bg-black',
  secondary: 'bg-white text-ink border border-line hover:bg-surface hover:border-faint/40',
  ghost: 'bg-transparent text-muted hover:text-ink',
  'on-dark': 'border border-white/20 text-white/80 hover:bg-white/10 hover:text-white',
  'on-dark-solid': 'bg-white text-ink hover:bg-white/90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-[42px] px-[18px] text-sm',
  lg: 'h-[46px] px-6 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  );
}
