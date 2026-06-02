import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const baseStyle = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';
  
  const variants = {
    primary: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    secondary: 'bg-purple-100 text-purple-800 border border-purple-200',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    danger: 'bg-red-100 text-red-800 border border-red-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    neutral: 'bg-slate-100 text-slate-800 border border-slate-200',
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
