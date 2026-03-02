import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const Card = ({ children, className = '', onClick, hover = true }: CardProps) => {
  const baseStyles = 'bg-navy-900 rounded-lg shadow-lg border border-navy-800 p-6';
  const hoverStyles = hover ? 'cursor-pointer' : '';
  
  const CardComponent = onClick || hover ? motion.div : 'div';
  
  const motionProps = (onClick || hover) ? {
    whileHover: { scale: 1.02, borderColor: 'rgba(99, 102, 241, 0.5)' },
    whileTap: onClick ? { scale: 0.98 } : undefined,
    transition: { duration: 0.2 }
  } : {};

  return (
    <CardComponent
      className={`${baseStyles} ${hoverStyles} ${className}`}
      onClick={onClick}
      {...motionProps}
    >
      {children}
    </CardComponent>
  );
};
