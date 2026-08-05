type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Rounded-square tile sizes, matching the design's avatar scale. */
const sizeClasses: Record<Size, string> = {
  xs: 'h-8 w-8 rounded-full text-[12px]',
  sm: 'h-10 w-10 rounded-md text-[13px]',
  md: 'h-[46px] w-[46px] rounded-lg text-[15px]',
  lg: 'h-14 w-14 rounded-lg text-[17px]',
  xl: 'h-[104px] w-[104px] rounded-full text-[30px]',
};

const toneClasses = {
  light: 'bg-fill text-ink',
  dark: 'bg-white/[0.07] text-white',
} as const;

export default function Avatar({
  initials,
  size = 'md',
  tone = 'light',
  className = '',
}: {
  initials: string;
  size?: Size;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-semibold ${sizeClasses[size]} ${toneClasses[tone]} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
