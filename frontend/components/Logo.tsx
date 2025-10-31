import Image from 'next/image';

type LogoProps = { 
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const imageSizes = {
    sm: { width: 32, height: 32, className: 'w-8 h-8 md:w-9 md:h-9' },
    md: { width: 40, height: 40, className: 'w-10 h-10 md:w-11 md:h-11' },
    lg: { width: 48, height: 48, className: 'w-12 h-12 md:w-14 md:h-14' }
  }[size];
  
  const textSizes = {
    sm: 'text-lg md:text-xl',
    md: 'text-xl md:text-2xl',
    lg: 'text-2xl md:text-3xl'
  }[size];

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="DogYenta logo"
        width={imageSizes.width}
        height={imageSizes.height}
        className={imageSizes.className}
        priority
        aria-hidden="true"
      />
      {showText && (
        <span className={`ml-2 ${textSizes} font-bold text-gray-900`}>DogYenta</span>
      )}
    </div>
  );
}

