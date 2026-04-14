import { useState } from 'react';
import { Image as ImageIcon, FileText, Code, File, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { ChatAttachment } from '@/types';
import { formatBytes } from '@/lib/fileValidation';
import { getFileIcon, arrayBufferToBase64 } from '@/lib/fileProcessing';
import { GifDisplay } from './GifDisplay';

interface MessageAttachmentsProps {
  attachments: ChatAttachment[];
}

export default function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const [selectedImage, setSelectedImage] = useState<ChatAttachment | null>(null);

  const downloadAttachment = (attachment: ChatAttachment) => {
    const blob = new Blob([attachment.fileData], { type: attachment.fileType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Image':
        return <ImageIcon className="h-5 w-5" />;
      case 'FileText':
        return <FileText className="h-5 w-5" />;
      case 'Code':
        return <Code className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  // Separate GIFs from regular images
  const gifs = attachments.filter(a => a.fileType === 'image/gif');
  const images = attachments.filter(a => a.fileType.startsWith('image/') && a.fileType !== 'image/gif');
  const documents = attachments.filter(a => !a.fileType.startsWith('image/'));

  return (
    <div className="mt-2 space-y-2">
      {/* GIF attachments - displayed separately like bot GIFs */}
      {gifs.length > 0 && (
        <div className="space-y-2">
          {gifs.map((attachment) => {
            const gifUrl = `data:${attachment.fileType};base64,${arrayBufferToBase64(attachment.fileData)}`;
            return (
              <div key={attachment.id} className="space-y-1">
                <GifDisplay
                  gifUrl={gifUrl}
                  previewUrl={gifUrl}
                  mood="attachment"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span className="truncate">{attachment.fileName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-2"
                    onClick={() => downloadAttachment(attachment)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {images.map((attachment) => {
            const imageUrl = attachment.thumbnailData || `data:${attachment.fileType};base64,${arrayBufferToBase64(attachment.fileData)}`;
            return (
              <div
                key={attachment.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden border border-border bg-muted"
                onClick={() => setSelectedImage(attachment)}
              >
                <img
                  src={imageUrl}
                  alt={attachment.fileName}
                  className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute bottom-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadAttachment(attachment);
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-1">
          {documents.map((attachment) => {
            const iconName = getFileIcon(attachment.fileType);
            
            return (
              <div
                key={attachment.id}
                className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="flex-shrink-0 text-muted-foreground">
                  {renderIcon(iconName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{attachment.fileName}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatBytes(attachment.fileSize)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => downloadAttachment(attachment)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Image lightbox */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <div className="relative">
              <img
                src={`data:${selectedImage.fileType};base64,${arrayBufferToBase64(selectedImage.fileData)}`}
                alt={selectedImage.fileName}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedImage.fileName}</div>
                    <div className="text-sm text-gray-300">{formatBytes(selectedImage.fileSize)}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadAttachment(selectedImage)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
