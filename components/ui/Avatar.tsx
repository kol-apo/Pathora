import Image from 'next/image';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Rounded-square tile sizes, matching the design's avatar scale. */
const sizeClasses: Record<Size, string> = {
  xs: 'h-8 w-8 rounded-full text-[12px]',
  sm: 'h-10 w-10 rounded-md text-[13px]',
  md: 'h-[46px] w-[46px] rounded-lg text-[15px]',
  lg: 'h-14 w-14 rounded-lg text-[17px]',
  xl: 'h-[104px] w-[104px] rounded-full text-[30px]',
};

/** Pixel size of each tile, for requesting a photo at the right resolution. */
const sizePx: Record<Size, number> = { xs: 32, sm: 40, md: 46, lg: 56, xl: 104 };

const toneClasses = {
  light: 'bg-sky-soft text-navy',
  dark: 'bg-white/[0.07] text-white',
} as const;

/**
 * A person's photo, or their initials when there is none. Decorative: the
 * name is always written next to it, so screen readers skip it.
 */
export default function Avatar({
  initials,
  photo,
  size = 'md',
  tone = 'light',
  className = '',
}: {
  initials: string;
  photo?: string | null;
  size?: Size;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt=""
        aria-hidden="true"
        width={sizePx[size]}
        height={sizePx[size]}
        // Photos are stored small already (see public/mentors), so they are
        // served as they are rather than through the image resizer.
        unoptimized
        // Headshots are portrait: keep the face in the square, not the shoulders.
        className={`shrink-0 object-cover object-[50%_22%] ${sizeClasses[size]} ${toneClasses[tone]} ${className}`}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-semibold ${sizeClasses[size]} ${toneClasses[tone]} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
