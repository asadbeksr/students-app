'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useGetCourseFiles } from '@/lib/queries/courseHooks';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Folder,
  File,
  FileText,
  FileImage,
  FileBarChart,
  Video,
  Presentation,
  Download,
  ChevronRight,
  Home,
  FolderOpen,
  Loader2,
} from 'lucide-react';

// Lazy-load PDFViewer — pdfjs-dist is ESM-only, must never run at module init
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

/* ─── helpers ────────────────────────────────────────────────────── */
function formatBytes(kb: number) {
  if (!kb) return '';
  const bytes = kb * 1024;
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function FileIcon({ mimeType, name, className = 'w-4 h-4' }: { mimeType?: string; name?: string; className?: string }) {
  const t = mimeType || '';
  const n = (name || '').toLowerCase();
  if (t.includes('video') || n.endsWith('.mp4') || n.endsWith('.m4v'))
    return <Video className={`${className} shrink-0 text-blue-500`} />;
  if (t.includes('image') || n.endsWith('.png') || n.endsWith('.jpg'))
    return <FileImage className={`${className} shrink-0 text-amber-500`} />;
  if (n.endsWith('.pdf'))
    return <FileText className={`${className} shrink-0 text-red-500`} />;
  if (n.endsWith('.ppt') || n.endsWith('.pptx'))
    return <Presentation className={`${className} shrink-0 text-orange-500`} />;
  if (n.endsWith('.xls') || n.endsWith('.xlsx') || n.endsWith('.csv'))
    return <FileBarChart className={`${className} shrink-0 text-emerald-500`} />;
  return <File className={`${className} shrink-0 text-muted-foreground`} />;
}

/* ─── types ──────────────────────────────────────────────────────── */
interface ApiItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  mimeType?: string;
  sizeInKiloBytes?: number;
  createdAt?: string;
  files?: ApiItem[];
}

interface PathEntry {
  name: string;
  items: ApiItem[];
}

interface SelectedFile {
  id: string;
  name: string;
  mimeType?: string;
  url: string;
}

/* ─── component ──────────────────────────────────────────────────── */
export default function MaterialsTab({ courseId }: { courseId: string }) {
  const numericId = parseInt(courseId, 10);
  const { data: rootItems = [], isLoading, isError } = useGetCourseFiles(numericId);

  const [pathStack, setPathStack] = useState<PathEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);

  const currentItems: ApiItem[] = pathStack.length > 0
    ? pathStack[pathStack.length - 1].items
    : (rootItems as ApiItem[]);

  const folders = currentItems.filter((i) => i.type === 'directory');
  const files = currentItems.filter((i) => i.type === 'file');

  const navigateTo = (folder: ApiItem) => {
    setPathStack((prev) => [...prev, { name: folder.name, items: folder.files ?? [] }]);
    setSelectedFile(null);
  };

  const navigateUpTo = (index: number) => {
    setPathStack((prev) => index === -1 ? [] : prev.slice(0, index + 1));
    setSelectedFile(null);
  };

  const handleFileClick = (item: ApiItem) => {
    setSelectedFile({
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      // Use the Next.js proxy so the auth token is included automatically
      url: `/api/polito/courses/${courseId}/files/${item.id}`,
    });
  };

  const isPdf = (f: SelectedFile) =>
    f.mimeType?.includes('pdf') || f.name.toLowerCase().endsWith('.pdf');

  /* loading */
  if (isLoading) {
    return (
      <div className="h-full flex">
        <div className="w-72 border-r border-border p-3 space-y-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Folder className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-foreground">Failed to load files</p>
          <p className="text-sm text-muted-foreground mt-1">Check your connection and try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <div className="w-64 xl:w-72 border-r border-border bg-card flex flex-col shrink-0">
        {/* Breadcrumbs */}
        <div className="px-3 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-1 flex-wrap text-xs">
            <button
              onClick={() => navigateUpTo(-1)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors rounded px-1.5 py-1"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="font-medium">Course Files</span>
            </button>
            {pathStack.map((entry, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <button
                  onClick={() => navigateUpTo(i)}
                  className={`truncate max-w-[100px] rounded px-1 py-0.5 transition-colors ${
                    i === pathStack.length - 1
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {entry.name}
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Folder list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {/* Folders */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigateTo(folder)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-muted/60 transition-colors text-left group"
              >
                <Folder className="h-4 w-4 shrink-0 text-primary fill-primary/20" />
                <span className="truncate flex-1 font-medium">{folder.name}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </button>
            ))}

            {/* Files in sidebar */}
            {files.length > 0 && folders.length > 0 && (
              <div className="px-2 pt-3 pb-1">
                <div className="h-px bg-border/50" />
              </div>
            )}
            {files.map((file) => {
              const isSelected = selectedFile?.id === file.id;
              return (
                <button
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors text-left group ${
                    isSelected
                      ? 'bg-primary/10 text-foreground'
                      : 'hover:bg-muted/60'
                  }`}
                >
                  <FileIcon mimeType={file.mimeType} name={file.name} />
                  <span className="truncate flex-1 min-w-0">{file.name}</span>
                  {file.sizeInKiloBytes ? (
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {formatBytes(file.sizeInKiloBytes)}
                    </span>
                  ) : null}
                </button>
              );
            })}

            {/* Empty folder */}
            {folders.length === 0 && files.length === 0 && (
              <div className="py-10 text-center">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">Empty folder</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Main Panel ───────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedFile ? (
          isPdf(selectedFile) ? (
            /* PDF Preview */
            <PDFViewer
              url={selectedFile.url}
              name={selectedFile.name}
              courseId={courseId}
              onClose={() => setSelectedFile(null)}
            />
          ) : (
            /* Non-PDF file: show info + download */
            <div className="h-full flex flex-col items-center justify-center gap-6 p-8 text-center">
              <FileIcon
                mimeType={selectedFile.mimeType}
                name={selectedFile.name}
                className="w-16 h-16"
              />
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selectedFile.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Preview not available for this file type
                </p>
              </div>
              <Button asChild>
                <a href={selectedFile.url} target="_blank" rel="noreferrer" download>
                  <Download className="h-4 w-4 mr-2" />
                  Download file
                </a>
              </Button>
            </div>
          )
        ) : (
          /* No file selected — prompt */
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-8">
            {folders.length > 0 || files.length > 0 ? (
              <>
                <FileText className="h-12 w-12 text-muted-foreground/20" />
                <p className="font-medium text-foreground">Select a file to preview</p>
                <p className="text-sm text-muted-foreground">
                  Click a file from the sidebar to open it here
                </p>
              </>
            ) : (
              <>
                <FolderOpen className="h-12 w-12 text-muted-foreground/20" />
                <p className="font-medium text-foreground">Navigate into a folder</p>
                <p className="text-sm text-muted-foreground">
                  Select a folder on the left to browse its contents
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
