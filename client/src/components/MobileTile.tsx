import React from 'react';
import { Link } from 'wouter';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTileProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  bgClass?: string;
  textClass?: string;
  href: string;
  onClick?: () => void;
  className?: string;
}

export function MobileTile({
  icon: Icon,
  title,
  description,
  bgClass = 'bg-gradient-to-br from-primary-500 to-primary-700',
  textClass = 'text-white',
  href,
  onClick,
  className,
}: MobileTileProps) {
  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <Link href={href}>
      <a 
        className={cn(
          'flex flex-col items-center justify-center rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full min-h-[120px] overflow-hidden relative', 
          bgClass,
          textClass,
          className
        )}
        onClick={handleClick}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 transform translate-x-4 -translate-y-4"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full bg-white/10 transform -translate-x-4 translate-y-4"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          <Icon className="w-8 h-8 mb-2" />
          <h3 className="text-center font-bold">{title}</h3>
          {description && (
            <p className="text-center text-xs opacity-80 mt-1">{description}</p>
          )}
        </div>
      </a>
    </Link>
  );
}
