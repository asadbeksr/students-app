import { ReactNode, useState } from 'react';
import { MathBlockType } from '@/lib/visualBlocks/detector';
import { Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';

interface MathBlockContainerProps {
  type: MathBlockType;
  latex: string;
  messageId?: string;
  children: ReactNode;
  className?: string;
}

export function MathBlockContainer({ type, latex: _latex, messageId: _messageId, children, className }: MathBlockContainerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={`my-6 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm ring-1 ring-border flex flex-col ${className || ''}`}>
        <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary/70"></span>
            {type.replace(/_/g, ' ')}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 hover:bg-background" 
            onClick={() => setIsOpen(true)}
            title="Full Screen"
          >
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
        <div className="p-4 sm:p-6 bg-gradient-to-b from-card to-muted/10 flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] w-full h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
             <span className="sr-only">
                <DialogTitle>{type.replace(/_/g, ' ')} Visualization</DialogTitle>
             </span>
            <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between shrink-0">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary/70"></span>
                    {type.replace(/_/g, ' ')}
                </span>
                <DialogClose asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-background">
                        <X className="h-4 w-4" />
                    </Button>
                </DialogClose>
            </div>
            <div className="flex-1 p-6 bg-gradient-to-b from-card to-muted/10 overflow-y-auto">
                {/* 
                   We render children again here. 
                   Note: This creates a NEW instance of the component, 
                   so internal state (slider positions) will reset. 
                   This is usually acceptable for a "view mode" switch.
                */}
                <div className="h-full flex flex-col">
                    {children}
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
