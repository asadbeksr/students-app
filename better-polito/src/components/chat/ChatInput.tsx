import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, Paperclip, Plus, LineChart, Zap, Brain, PlaySquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { validateFile, getAcceptedFileTypes, FILE_LIMITS } from '@/lib/fileValidation';
import { useToast } from '@/hooks/use-toast';
import AttachmentPreview from './AttachmentPreview';
import { useSettingsStore } from '@/stores/settingsStore';

const PLACEHOLDERS = [
  'Ask anything about your courses…',
  'Explain a concept from your notes…',
  'Help me prepare for the exam…',
  'Summarise this lecture…',
  'What are the key topics I should study?',
  'Create practice questions on this topic…',
];

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
}

export default function ChatInput({ value, onChange, onSubmit, disabled, attachments, onAttachmentsChange }: ChatInputProps) {
  const { toast } = useToast();
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const [inputHeight, setInputHeight] = useState(40);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { settings, setAiModel, updateSettings } = useSettingsStore();

  const visualModeEnabled = settings?.visualMode?.enabled ?? true;
  const manimModeEnabled = settings?.manimMode ?? true;
  const aiModel = settings?.aiModel || 'gemini-flash-latest';
  const currentVisualModeEnabled = settings?.visualMode?.enabled ?? true;

  // Cycle placeholder text with fade
  useEffect(() => {
    if (isFocused || value) return;
    const id = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length);
        setPlaceholderVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(id);
  }, [isFocused, value]);

  const toggleVisualMode = async () => {
    if (!settings) return;
    const currentVisualSettings = settings.visualMode || {
      enabled: true, animationsEnabled: true, autoExpandBlocks: true, preferredBlockSize: 'normal' as const
    };
    await updateSettings({ visualMode: { ...currentVisualSettings, enabled: !currentVisualModeEnabled } });
  };

  const toggleManimMode = async () => {
    if (!settings) return;
    await updateSettings({ manimMode: !manimModeEnabled });
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const newHeight = Math.max(Math.min(textareaRef.current.scrollHeight, 200), 40);
      textareaRef.current.style.height = `${newHeight}px`;
      setInputHeight(newHeight);
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || attachments.length > 0) && !disabled) onSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await addFiles(files);
    e.target.value = '';
  };

  const addFiles = async (newFiles: File[]) => {
    setIsProcessingFiles(true);
    try {
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of newFiles) {
        if (attachments.length + validFiles.length >= FILE_LIMITS.maxAttachments) {
          errors.push(`Maximum ${FILE_LIMITS.maxAttachments} files allowed`);
          break;
        }
        const validation = validateFile(file);
        if (validation.valid) validFiles.push(file);
        else errors.push(`${file.name}: ${validation.error}`);
      }

      if (validFiles.length > 0) {
        onAttachmentsChange([...attachments, ...validFiles]);
        toast({ title: 'Files added', description: `Added ${validFiles.length} file(s)` });
      }
      if (errors.length > 0) {
        toast({ title: 'Some files were not added', description: errors.join('\n'), variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error adding files', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const removeAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    await addFiles(Array.from(e.dataTransfer.files));
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.kind === 'file') { const f = item.getAsFile(); if (f) files.push(f); }
    }
    if (files.length > 0) {
      e.preventDefault();
      toast({ title: 'Files detected', description: `Pasted ${files.length} file(s) — processing…` });
      await addFiles(files);
    }
  };

  const canSend = (value.trim() || attachments.length > 0) && !disabled;

  return (
    <div className="relative px-2 md:px-4 pb-2 md:pb-6">
      <div className="max-w-3xl mx-auto">
        <input ref={fileInputRef} type="file" accept={getAcceptedFileTypes()} multiple onChange={handleFileSelect} className="hidden" />

        <div
          className={`
            relative bg-card rounded-2xl md:rounded-3xl border-2
            transition-all duration-300 ease-out
            ${isFocused
              ? 'border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.08)] shadow-xl'
              : isDragging
              ? 'border-primary bg-primary/5 shadow-lg scale-[1.005]'
              : 'border-border shadow-md hover:border-border/80 hover:shadow-lg'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-2 md:px-3 pt-2 md:pt-3 pb-1 md:pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {attachments.map((file, index) => (
                  <AttachmentPreview key={`${file.name}-${index}`} file={file} onRemove={() => removeAttachment(index)} />
                ))}
              </div>
            </div>
          )}

          <div className={`flex gap-1.5 md:gap-2 p-2 md:p-3 ${inputHeight <= 44 ? 'items-center' : 'items-end'}`}>
            {/* Plus menu */}
            <div className="flex items-center gap-0.5 md:gap-1">
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <div className={`
                    relative flex items-center justify-center rounded-lg
                    transition-all duration-300
                    ${visualModeEnabled ? 'p-[2px] bg-green-500' : 'p-0'}
                  `}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`
                        h-8 w-8 md:h-9 md:w-9 p-0 rounded-[6px] group
                        transition-all duration-200
                        active:scale-90
                        ${visualModeEnabled
                          ? 'bg-card hover:bg-muted text-foreground'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      <Plus className={`h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isMenuOpen ? 'rotate-[135deg]' : 'hover:rotate-90'}`} />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-2">
                  <DropdownMenuItem
                    onSelect={() => fileInputRef.current?.click()}
                    disabled={disabled || attachments.length >= FILE_LIMITS.maxAttachments || isProcessingFiles}
                    className="cursor-pointer text-sm font-normal py-2 transition-colors duration-150"
                  >
                    <Paperclip className="mr-3 h-4 w-4 text-muted-foreground" />
                    <span>Upload File</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuCheckboxItem
                    checked={visualModeEnabled}
                    onCheckedChange={toggleVisualMode}
                    className="cursor-pointer text-sm font-normal py-2 transition-colors duration-150"
                  >
                    <span className="flex items-center">
                      <LineChart className={`mr-3 h-4 w-4 transition-colors duration-200 ${visualModeEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span>Visual Mode</span>
                    </span>
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={manimModeEnabled}
                    onCheckedChange={toggleManimMode}
                    className="cursor-pointer text-sm font-normal py-2 transition-colors duration-150"
                  >
                    <span className="flex items-center">
                      <PlaySquare className={`mr-3 h-4 w-4 transition-colors duration-200 ${manimModeEnabled ? 'text-purple-500' : 'text-muted-foreground'}`} />
                      <span>Manim Animations</span>
                    </span>
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                    Model
                  </DropdownMenuLabel>

                  <DropdownMenuCheckboxItem
                    checked={aiModel === 'gemini-flash-latest'}
                    onCheckedChange={() => setAiModel('gemini-flash-latest')}
                    className="cursor-pointer text-sm font-normal py-2 transition-colors duration-150"
                  >
                    <span className="flex items-center">
                      <Zap className={`mr-3 h-4 w-4 transition-colors duration-200 ${aiModel === 'gemini-flash-latest' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                      <span>Flash <span className="text-muted-foreground text-xs">(Fast)</span></span>
                    </span>
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={aiModel === 'gemini-pro-latest'}
                    onCheckedChange={() => setAiModel('gemini-pro-latest')}
                    className="cursor-pointer text-sm font-normal py-2 transition-colors duration-150"
                  >
                    <span className="flex items-center">
                      <Brain className={`mr-3 h-4 w-4 transition-colors duration-200 ${aiModel === 'gemini-pro-latest' ? 'text-purple-500' : 'text-muted-foreground'}`} />
                      <span>Pro <span className="text-muted-foreground text-xs">(Smart)</span></span>
                    </span>
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Textarea + animated placeholder */}
            <div className="flex-1 min-w-0 relative">
              {/* Animated placeholder overlay */}
              {!value && !isFocused && (
                <span
                  className="absolute inset-0 flex items-center pointer-events-none text-sm md:text-[15px] text-muted-foreground/60 transition-opacity duration-300 select-none"
                  style={{ opacity: placeholderVisible ? 1 : 0 }}
                >
                  {PLACEHOLDERS[placeholderIdx]}
                </span>
              )}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={disabled}
                placeholder={isFocused ? 'Ask anything…' : ''}
                rows={1}
                className="
                  w-full resize-none bg-transparent border-0 outline-none
                  text-foreground placeholder-muted-foreground/40
                  text-sm md:text-[15px] leading-6 py-2
                  [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-opacity duration-200 block
                "
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              />
            </div>

            {/* Send button */}
            <div className="flex items-center">
              <Button
                type="button"
                onClick={onSubmit}
                disabled={!canSend}
                size="sm"
                variant={canSend ? "default" : "ghost"}
                className={`
                  h-8 w-8 md:h-9 md:w-9 p-0 rounded-full shadow-none
                  transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  ${canSend
                    ? 'scale-100 opacity-100 hover:scale-105 active:scale-95 text-primary-foreground bg-primary'
                    : 'scale-90 opacity-40 bg-muted text-muted-foreground'
                  }
                `}
              >
                <ArrowUp className="h-4 w-4 md:h-[18px] md:w-[18px] transition-transform duration-300" strokeWidth={2.5} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
