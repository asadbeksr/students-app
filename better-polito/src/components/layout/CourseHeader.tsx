import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils/cn';

interface CourseHeaderProps {
  title: string;
  subtitle?: string;
  metadata?: ReactNode;
  action?: ReactNode;
  tabs?: ReactNode;
}

export default function CourseHeader({ title, subtitle, metadata, action, tabs }: CourseHeaderProps) {
  return (
    <div className="bg-card border-b border-border shrink-0">
      <div className="min-h-[73px] px-3 md:px-6 py-3 md:py-0 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
        {/* Course info */}
        <div className="flex-shrink-0 min-w-0">
          <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground text-xs md:text-sm mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        
        {/* Tabs */}
        {tabs && (
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
            {tabs}
          </div>
        )}
        
        {/* Right side - metadata and actions */}
        <div className={cn("flex items-center gap-2 md:gap-3 shrink-0 flex-wrap", !tabs && "md:ml-auto")}>
          {metadata}
          {action}
        </div>
      </div>
    </div>
  );
}

export { Badge };
