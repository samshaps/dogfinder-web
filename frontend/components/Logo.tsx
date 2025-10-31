type LogoProps = { 
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const boxSizes = { 
    sm: 'w-8 h-8 md:w-9 md:h-9', 
    md: 'w-10 h-10 md:w-11 md:h-11', 
    lg: 'w-12 h-12 md:w-14 md:h-14' 
  }[size];
  
  const iconSizes = { 
    sm: 'w-6 h-6 md:w-7 md:h-7', 
    md: 'w-8 h-8 md:w-9 md:h-9', 
    lg: 'w-10 h-10 md:w-12 md:h-12' 
  }[size];
  
  const textSizes = {
    sm: 'text-lg md:text-xl',
    md: 'text-xl md:text-2xl',
    lg: 'text-2xl md:text-3xl'
  }[size];

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`${boxSizes} bg-blue-600 rounded-xl flex items-center justify-center`}>
        <svg
          viewBox="0 0 24 24"
          className={`${iconSizes} text-white`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2C9.24 2 7 4.24 7 7c0 4.5 5 11 5 11s5-6.5 5-11c0-2.76-2.24-5-5-5zm-1.5 8c-.83 0-1.5-.67-1.5-1.5S9.67 7.5 10.5 7.5 12 8.17 12 9s-.67 1.5-1.5 1.5zm3 0c-.83 0-1.5-.67-1.5-1.5S12.67 7.5 13.5 7.5 15 8.17 15 9s-.67 1.5-1.5 1.5zM12 8.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
          <path d="M8 11.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm8 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" opacity="0.7"/>
        </svg>
      </div>
      {showText && (
        <span className={`ml-2 ${textSizes} font-bold text-gray-900`}>DogYenta</span>
      )}
    </div>
  );
}

