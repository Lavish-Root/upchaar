import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Central Staff */}
    <path d="M12 2v20" strokeWidth="2" />
    <circle cx="12" cy="3" r="1.5" fill="currentColor" stroke="none" />
    
    {/* Wings */}
    <path d="M12 8c-3.5-3-7.5-2-9.5 2 0 0 2.5 1 5.5-1 3.5-2 3.5 1 4 2" />
    <path d="M12 8c3.5-3 7.5-2 9.5 2 0 0-2.5 1-5.5-1-3.5-2-3.5 1-4 2" />
    
    {/* Snakes Intertwined */}
    <path d="M12 18c-2 1-3.5 0-3.5-2s3.5-3 3.5-5c0-2-2.5-3-3.5-4" />
    <path d="M12 18c2 1 3.5 0 3.5-2s-3.5-3-3.5-5c0-2 2.5-3 3.5-4" />
  </svg>
);

export default Logo;