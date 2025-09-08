'use client';

import React from 'react';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses =
    size === 'sm' ? 'w-6 h-6 text-sm' : size === 'lg' ? 'w-12 h-12 text-xl' : 'w-8 h-8 text-lg';

  return (
    <div className={`${sizeClasses} bg-emerald-600 rounded-lg flex items-center justify-center ${className}`}>
      <span className="text-white font-bold leading-none">S</span>
    </div>
  );
};


