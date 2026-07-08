import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}

export default function Input({ icon, className = '', ...rest }: InputProps) {
  return (
    <div className={`relative ${className}`}>
      {icon && (
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-light">
          {icon}
        </span>
      )}
      <input
        className={`h-12 w-full rounded-[10px] border bg-white text-[15px] text-text-main placeholder:text-text-light focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20 ${
          icon ? 'pl-11 pr-4' : 'px-4'
        }`}
        {...rest}
      />
    </div>
  );
}
