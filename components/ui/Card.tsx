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
      className={`rounded-lg border border-line bg-white ${padding ? 'p-[22px]' : ''} ${
        hover ? 'transition-colors duration-150 hover:border-faint/40' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
