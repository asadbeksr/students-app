import { X, Image as ImageIcon, FileText, Code, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/fileValidation';
import { getFileIcon, getFileTypeCategory } from '@/lib/fileProcessing';
import { useState, useEffect } from 'react';
import { extractPdfText, type PdfTextExtractionResult } from '@/lib/pdfTextExtraction';

interface AttachmentPreviewProps {
  file: File;
  onRemove: () => void;
}

export default function AttachmentPreview({ file, onRemove }: AttachmentPreviewProps) {
  const category = getFileTypeCategory(file.type);
  const iconName = getFileIcon(file.type);
  const [pdfInfo, setPdfInfo] = useState<PdfTextExtractionResult | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);

  // Extract PDF text preview on mount
  useEffect(() => {
    if (file.type === 'application/pdf') {
      setIsExtractingPdf(true);
      file.arrayBuffer()
        .then(extractPdfText)
        .then(setPdfInfo)
        .catch(error => {
          console.error('Failed to extract PDF preview:', error);
          setPdfInfo(null);
        })
        .finally(() => setIsExtractingPdf(false));
    }
  }, [file]);

  const renderIcon = () => {
    switch (iconName) {
      case 'Image':
        return <ImageIcon className="h-4 w-4" />;
      case 'FileText':
        return <FileText className="h-4 w-4" />;
      case 'Code':
        return <Code className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const renderPreview = () => {
    if (category === 'image') {
      const url = URL.createObjectURL(file);
      return (
        <img
          src={url}
          alt={file.name}
          className="w-full h-full object-cover"
          onLoad={() => URL.revokeObjectURL(url)}
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        {renderIcon()}
      </div>
    );
  };

  const renderPdfStatus = () => {
    if (file.type !== 'application/pdf') return null;
    
    if (isExtractingPdf) {
      return (
        <div className="absolute top-1 left-1">
          <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
        </div>
      );
    }
    
    if (pdfInfo) {
      if (pdfInfo.isLikelyScanned) {
        return (
          <div className="absolute top-1 left-1" title="Scanned PDF - text extraction may be limited">
            <AlertCircle className="h-3 w-3 text-yellow-500" />
          </div>
        );
      } else {
        return (
          <div className="absolute top-1 left-1" title={`Text extracted (${pdfInfo.pageCount} pages)`}>
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          </div>
        );
      }
    }
    
    return null;
  };

  return (
    <div className="relative group inline-block">
      <div className="w-20 h-20 rounded-lg border-2 border-border overflow-hidden bg-card">
        {renderPreview()}
        {renderPdfStatus()}
      </div>
      
      {/* Remove button */}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onRemove}
        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </Button>
      
      {/* File info tooltip */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="truncate">{file.name}</div>
        <div className="text-gray-300">{formatBytes(file.size)}</div>
        {pdfInfo && file.type === 'application/pdf' && (
          <div className="text-gray-300">
            {pdfInfo.pageCount} page{pdfInfo.pageCount !== 1 ? 's' : ''} • {pdfInfo.isLikelyScanned ? 'Scanned' : 'Text-based'}
          </div>
        )}
      </div>
    </div>
  );
}
