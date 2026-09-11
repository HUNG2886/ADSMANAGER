import Image from 'next/image';

type BrandLogoProps = {
  className?: string;
  decorative?: boolean;
  preload?: boolean;
  variant?: 'mark' | 'full';
};

export function BrandLogo({
  className = '',
  decorative = false,
  preload = false,
  variant = 'mark',
}: BrandLogoProps) {
  return (
    <span className={`brand-logo brand-logo--${variant} ${className}`.trim()}>
      <Image
        src="/david-agency-logo.png"
        alt={decorative ? '' : 'David Agency logo'}
        width={1254}
        height={1254}
        preload={preload}
        draggable={false}
      />
    </span>
  );
}
