'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMaterialStore } from '@/stores/materialStore';
import { useToast } from '@/hooks/use-toast';
import type { Material } from '@/types';
import { Save, X } from 'lucide-react';

interface NoteEditorProps {
  material: Material;
  onClose?: () => void;
}

export default function NoteEditor({ material, onClose }: NoteEditorProps) {
  const [content, setContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { updateMaterial } = useMaterialStore();
  const { toast } = useToast();

  useEffect(() => {
    const initialContent = typeof material.content === 'string' ? material.content : '';
    setContent(initialContent);
    setIsDirty(false);
  }, [material.id, material.content]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMaterial(material.id, { content });
      setIsDirty(false);
      toast({ title: 'Saved', description: 'Note saved successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save note', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (value: string) => {
    setContent(value);
    setIsDirty(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">{material.name}</h2>
          <p className="text-sm text-muted-foreground">
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={!isDirty || isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Start writing your notes here...\n\nYou can use Markdown:\n- **bold** for bold text\n- *italic* for italic\n- # Heading for headings\n- \`code\` for inline code`}
          className="flex-1 w-full h-full resize-none p-4 font-mono text-sm bg-background text-foreground border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50"
          style={{ minHeight: 0 }}
        />
      </div>

      {/* Quick Guide */}
      <div className="p-3 border-t border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">Quick Tips:</span>
          <span>**bold**</span>
          <span>*italic*</span>
          <span>`code`</span>
          <span>- list</span>
          <span>### heading</span>
        </div>
      </div>
    </div>
  );
}
