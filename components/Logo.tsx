import React from 'react';

export interface LogoProps {
  className?: string;
  variant?: 'icon' | 'full' | 'horizontal';
  alt?: string;
  showTagline?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  className = "w-8 h-8",
  variant = "icon",
  alt = "PraanSeva Logo",
  showTagline = false,
}) => {
  if (variant === 'full') {
    return (
      <div className="flex flex-col items-center">
        <img
          src="/praanseva-full.png"
          alt={alt}
          className={`${className} object-contain`}
          loading="eager"
        />
        {showTagline && (
          <span className="text-xs font-semibold text-emerald-700 tracking-wider uppercase mt-1">
            Care Today. Healthier Tomorrows.
          </span>
        )}
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className="flex items-center gap-3">
        <img
          src="/praanseva-icon.png"
          alt={alt}
          className={`${className} object-contain shrink-0`}
          loading="eager"
        />
        <div className="flex flex-col items-start leading-none">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            <span className="text-[#002D56]">Praan</span>
            <span className="text-[#00875A]">Seva</span>
            <span className="text-[10px] align-super text-emerald-600 font-bold ml-0.5">™</span>
          </span>
          {showTagline && (
            <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-700 tracking-wider uppercase mt-0.5">
              Care Today. Healthier Tomorrows.
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default: Clean square emblem
  return (
    <img
      src="/praanseva-icon.png"
      alt={alt}
      className={`${className} object-contain`}
      loading="eager"
    />
  );
};

export default Logo;