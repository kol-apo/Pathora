import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}

export default function Input({ icon, className = '', ...rest }: InputProps) {
  return (
    <div className={`relative ${className}`}>
      {icon && (
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
          {icon}
        </span>
      )}
      <input
        className={`h-[46px] w-full rounded border border-line bg-white text-sm text-ink placeholder:text-faint focus:border-ink focus:outline-none ${
          icon ? 'pl-[42px] pr-4' : 'px-4'
        }`}
        {...rest}
      />
    </div>
  );
}
