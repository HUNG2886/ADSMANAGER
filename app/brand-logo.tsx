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
  const asset = variant === 'mark'
    ? { src: '/david-agency-mark.png', width: 712, height: 450 }
    : { src: '/david-agency-logo-transparent.png', width: 933, height: 781 };

  return (
    <span className={`brand-logo brand-logo--${variant} ${className}`.trim()}>
      <Image
        src={asset.src}
        alt={decorative ? '' : 'David Agency logo'}
        width={asset.width}
        height={asset.height}
        preload={preload}
        draggable={false}
      />
    </span>
  );
}
