import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: boolean;
}

export default function Card({
  hover = false,
  padding = true,
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-xl border bg-white ${padding ? 'p-6 md:p-7' : ''} ${
        hover
          ? 'transition-all duration-200 ease-out hover:-translate-y-1 hover:border-amber/30 hover:shadow-card-hover'
          : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
