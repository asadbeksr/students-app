'use client';
import { useState } from 'react';
import { useMaterialStore } from '@/stores/materialStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CreateNoteDialogProps {
  courseId: string;
  folderId?: string | null;
  children: React.ReactNode;
}

export default function CreateNoteDialog({ courseId, folderId = null, children }: CreateNoteDialogProps) {
  const { createMaterial } = useMaterialStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Note name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await createMaterial({
        courseId,
        folderId,
        type: 'note',
        name: name.trim(),
        content: '',
      });
      toast({
        title: 'Success',
        description: 'Note created successfully',
      });
      setOpen(false);
      setName('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create note',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Note</DialogTitle>
            <DialogDescription>
              Create a new note to capture your learning
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="note-name">Note Name *</Label>
              <Input
                id="note-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Limits - Summary"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
