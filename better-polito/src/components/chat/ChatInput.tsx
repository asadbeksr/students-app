import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Microscope, Plus, LineChart } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
const useTranslation = () => ({ t: (str: string) => str.split('.').pop() || str });
import { validateFile, getAcceptedFileTypes, FILE_LIMITS } from '@/lib/fileValidation';
import { useToast } from '@/hooks/use-toast';
import AttachmentPreview from './AttachmentPreview';

import { useSettingsStore } from '@/stores/settingsStore';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
}

export default function ChatInput({ value, onChange, onSubmit, disabled, attachments, onAttachmentsChange }: ChatInputProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { settings, setExplanationMode, updateSettings } = useSettingsStore();
  const explanationMode = settings?.explanationMode || 'deep';
  const visualModeEnabled = settings?.visualMode?.enabled ?? true;

  const toggleVisualMode = async () => {
    if (!settings) return;
    // Ensure we preserve other visual mode settings
    const currentVisualSettings = settings.visualMode || {
      enabled: true,
      animationsEnabled: true,
      autoExpandBlocks: true,
      preferredBlockSize: 'normal' as const
    };

    await updateSettings({
      visualMode: {
        ...currentVisualSettings,
        enabled: !currentVisualModeEnabled
      }
    });
  };

  // Helper to handle visual mode toggle separately to simplify async logic in render
  const currentVisualModeEnabled = settings?.visualMode?.enabled ?? true;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || attachments.length > 0) && !disabled) {
        onSubmit();
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await addFiles(files);
    // Reset input
    e.target.value = '';
  };

  const addFiles = async (newFiles: File[]) => {
    setIsProcessingFiles(true);

    try {
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of newFiles) {
        // Check max attachments
        if (attachments.length + validFiles.length >= FILE_LIMITS.maxAttachments) {
          errors.push(`Maximum ${FILE_LIMITS.maxAttachments} files allowed`);
          break;
        }

        // Validate file
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          errors.push(`${file.name}: ${validation.error}`);
        }
      }

      if (validFiles.length > 0) {
        onAttachmentsChange([...attachments, ...validFiles]);

        toast({
          title: 'Files added',
          description: `Added ${validFiles.length} file(s)`,
        });
      }

      if (errors.length > 0) {
        toast({
          title: 'Some files were not added',
          description: errors.join('\n'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error adding files',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await addFiles(files);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files: File[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      toast({
        title: 'Files detected',
        description: `Pasted ${files.length} file(s) - processing...`,
      });
      await addFiles(files);
    }
  };

  return (
    <div className="relative px-2 md:px-4 pb-2 md:pb-6">
      <div className="max-w-4xl mx-auto">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedFileTypes()}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div
          className={`
            relative bg-card rounded-2xl md:rounded-3xl shadow-lg border-2 transition-all duration-200
            ${isFocused ? 'border-primary shadow-xl' : isDragging ? 'border-primary bg-primary/5' : 'border-border shadow-md'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="px-2 md:px-3 pt-2 md:pt-3 pb-1 md:pb-2">
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {attachments.map((file, index) => (
                  <AttachmentPreview
                    key={`${file.name}-${index}`}
                    file={file}
                    onRemove={() => removeAttachment(index)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-end gap-1.5 md:gap-2 p-2 md:p-3">
            {/* Left buttons - Chat GPT Style Plus Menu */}
            <div className="flex items-center gap-0.5 md:gap-1 pb-[6px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className={`
                    relative flex items-center justify-center rounded-lg transition-all duration-300
                    ${explanationMode === 'deep' && visualModeEnabled
                      ? 'p-[2px] bg-gradient-to-br from-blue-500 to-green-500'
                      : explanationMode === 'deep'
                        ? 'p-[2px] bg-blue-500'
                        : visualModeEnabled
                          ? 'p-[2px] bg-green-500'
                          : 'p-0'
                    }
                  `}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`
                        h-8 w-8 md:h-9 md:w-9 p-0 rounded-[6px] transition-colors
                        ${(explanationMode === 'deep' || visualModeEnabled)
                          ? 'bg-card hover:bg-muted text-foreground'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      <Plus className={`h-5 w-5 ${explanationMode === 'deep' || visualModeEnabled ? 'text-foreground' : ''}`} />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-2">
                  <DropdownMenuItem
                    onSelect={() => fileInputRef.current?.click()}
                    disabled={disabled || attachments.length >= FILE_LIMITS.maxAttachments || isProcessingFiles}
                    className="cursor-pointer text-sm font-normal py-2"
                  >
                    <Paperclip className="mr-3 h-4 w-4 text-muted-foreground" />
                    <span>Upload File</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                    Modes
                  </DropdownMenuLabel>

                  <DropdownMenuCheckboxItem
                    checked={explanationMode === 'deep'}
                    onCheckedChange={(checked) => setExplanationMode(checked ? 'deep' : 'quick')}
                    className="cursor-pointer text-sm font-normal py-2"
                  >
                    <span className="flex items-center">
                      <Microscope className={`mr-3 h-4 w-4 ${explanationMode === 'deep' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                      <span>Deep Explanations</span>
                    </span>
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={visualModeEnabled}
                    onCheckedChange={toggleVisualMode}
                    className="cursor-pointer text-sm font-normal py-2"
                  >
                    <span className="flex items-center">
                      <LineChart className={`mr-3 h-4 w-4 ${visualModeEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span>Visual Mode</span>
                    </span>
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={settings?.gifsEnabled ?? true}
                    onCheckedChange={(checked) => updateSettings({ gifsEnabled: checked })}
                    className="cursor-pointer text-sm font-normal py-2"
                  >
                    <span className="flex items-center">
                      <div className="mr-3 h-4 w-4 flex items-center justify-center overflow-hidden">
                        <img
                          src="https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif"
                          alt="GIF"
                          className={`w-full h-full object-cover ${settings?.gifsEnabled ? '' : 'opacity-50 grayscale'}`}
                        />
                      </div>
                      <span>Enable GIFs</span>
                    </span>
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>

            {/* Textarea */}
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={disabled}
                placeholder={t('chat.placeholder')}
                rows={1}
                className="
                  w-full resize-none bg-transparent border-0 outline-none
                  text-foreground placeholder-muted-foreground
                  text-sm md:text-[15px] leading-6 py-2
                  scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                style={{ maxHeight: '200px' }}
              />
            </div>

            {/* Send button */}
            <div className="pb-[6px]">
              <Button
                type="button"
                onClick={onSubmit}
                disabled={disabled || (!value.trim() && attachments.length === 0)}
                size="sm"
                className="h-8 w-8 md:h-9 md:w-9 p-0 rounded-lg"
              >
                <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
