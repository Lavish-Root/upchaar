import React from 'react';

export interface LogoProps {
  className?: string;
  useImage?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8", useImage = false }) => {
  if (useImage) {
    return (
      <img
        src="/praanseva-logo.jpg"
        alt="PraanSeva Logo"
        className={`${className} object-contain`}
      />
    );
  }

  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* PraanSeva Care Figure Head */}
      <circle cx="48" cy="18" r="9" />

      {/* Left Caring Hand & Body Arc */}
      <path d="M 45 28 C 38 34, 30 46, 31 62 C 32 72, 38 82, 50 85 C 44 82, 38 74, 38 64 C 38 52, 44 40, 52 34 Z" />
      <path d="M 48 38 C 42 45, 38 55, 42 66 C 45 74, 52 78, 50 85 C 40 82, 32 72, 32 58 C 32 44, 40 32, 48 26 Z" opacity="0.9" />

      {/* Right Protection Arc */}
      <path d="M 54 28 C 66 30, 78 40, 78 54 C 78 64, 72 73, 62 78 C 70 72, 74 64, 74 54 C 74 42, 65 34, 54 30 Z" />

      {/* Medical Cross Symbol */}
      <rect x="58" y="38" width="6" height="18" rx="2.5" />
      <rect x="52" y="44" width="18" height="6" rx="2.5" />

      {/* Herbal / Wellness Leaf */}
      <path d="M 52 82 C 58 78, 66 66, 68 56 C 72 68, 68 80, 52 82 Z" />
      <path d="M 51 84 C 60 84, 72 76, 76 64 C 74 76, 64 85, 51 84 Z" opacity="0.8" />
    </svg>
  );
};

export default Logo;