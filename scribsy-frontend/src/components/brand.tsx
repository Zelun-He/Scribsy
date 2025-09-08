'use client';

import React from 'react';
import { Logo } from '@/components/logo';

type BrandProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  textClassName?: string;
};

export const Brand: React.FC<BrandProps> = ({ size = 'md', className = '', textClassName = '' }) => {
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Logo size={size} />
      <span className={`ml-2 font-semibold ${textSize} ${textClassName}`}>Scribsy</span>
    </span>
  );
};


