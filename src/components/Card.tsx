import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 p-6 shadow-sm ${
        hoverable ? 'hover:shadow-md transition-all duration-200 cursor-pointer hover:border-slate-200' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
