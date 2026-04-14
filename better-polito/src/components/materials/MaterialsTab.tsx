'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  useGetCourseFiles,
  useGetCourseAssignments,
  useGetCourseVirtualClassrooms,
  useGetCourseVideolectures,
} from '@/lib/queries/courseHooks';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Folder, FolderOpen, File, FileText, FileImage, FileBarChart,
  Video, Presentation, Music, Download, Loader2,
  PanelLeftClose, PanelLeftOpen, ChevronRight, ChevronDown, ChevronLeft, Code,
  Package, Monitor, ExternalLink, X, CheckSquare2, Square,
  LayoutGrid, List, ArrowUpDown,
} from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePanelRef } from 'react-resizable-panels';

export type MaterialsActiveTab = 'teaching' | 'dropbox' | 'virtual';

/* ─── snap helpers ────────────────────────────────────────────────── */
const SIDEBAR_SNAPS = [0, 20, 25, 33, 50];
const SNAP_THRESHOLD = 6;

function nearestSnap(value: number, snaps: number[]): number | null {
  const nearest = snaps.reduce((a, b) => Math.abs(b - value) < Math.abs(a - value) ? b : a);
  return Math.abs(nearest - value) <= SNAP_THRESHOLD ? nearest : null;
}

function useSnapOnRelease(
  panelRef: ReturnType<typeof usePanelRef>,
  snaps: number[],
  onCollapse?: () => void,
) {
  const sizeRef = useRef(0);
  const onResize = (size: { asPercentage: number; inPixels: number }) => {
    sizeRef.current = size.asPercentage ?? 0;
  };
  useEffect(() => {
    const snap = () => {
      const pct = sizeRef.current;
      if (!pct && pct !== 0) return;
      const target = nearestSnap(pct, snaps);
      if (target == null || Math.abs(target - pct) < 0.5) return;
      if (target === 0) { panelRef.current?.collapse(); onCollapse?.(); }
      else panelRef.current?.resize(`${target}%`);
    };
    document.addEventListener('pointerup', snap);
    return () => document.removeEventListener('pointerup', snap);
  }, [panelRef, snaps, onCollapse]);
  return onResize;
}

/* ─── helpers ─────────────────────────────────────────────────────── */
function formatBytes(kb: number) {
  if (!kb) return '';
  const bytes = kb * 1024;
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

type FileKind = 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'code' | 'other';

function getFileKind(mimeType?: string, name?: string): FileKind {
  const m = mimeType ?? '';
  const n = (name ?? '').toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf')) return 'pdf';
  if (m.includes('image') || /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/.test(n)) return 'image';
  if (m.includes('video') || /\.(mp4|webm|mov|m4v|mkv|avi)$/.test(n)) return 'video';
  if (m.includes('audio') || /\.(mp3|wav|ogg|m4a|flac|aac)$/.test(n)) return 'audio';
  if (/\.(txt|md|rst|csv|log)$/.test(n)) return 'text';
  if (/\.(js|ts|jsx|tsx|py|java|c|cpp|h|rs|go|rb|php|sh|json|yaml|yml|xml|html|css)$/.test(n)) return 'code';
  return 'other';
}

function FileIcon({ mimeType, name, className = 'w-4 h-4' }: { mimeType?: string; name?: string; className?: string }) {
  const kind = getFileKind(mimeType, name);
  const n = (name ?? '').toLowerCase();
  if (kind === 'video') return <Video className={`${className} shrink-0 text-blue-500`} />;
  if (kind === 'image') return <FileImage className={`${className} shrink-0 text-amber-500`} />;
  if (kind === 'pdf') return <FileText className={`${className} shrink-0 text-red-500`} />;
  if (kind === 'audio') return <Music className={`${className} shrink-0 text-purple-500`} />;
  if (kind === 'code') return <Code className={`${className} shrink-0 text-green-500`} />;
  if (n.endsWith('.ppt') || n.endsWith('.pptx')) return <Presentation className={`${className} shrink-0 text-orange-500`} />;
  if (n.endsWith('.xls') || n.endsWith('.xlsx')) return <FileBarChart className={`${className} shrink-0 text-emerald-500`} />;
  return <File className={`${className} shrink-0 text-muted-foreground`} />;
}

/* ─── types ───────────────────────────────────────────────────────── */
interface ApiItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  mimeType?: string;
  sizeInKiloBytes?: number;
  createdAt?: string;
  files?: ApiItem[];
}

interface SelectedFile {
  id: string;
  name: string;
  mimeType?: string;
  url: string;
  /** fallback external link if no direct URL */
  externalUrl?: string;
}

/* ─── selection item type ─────────────────────────────────────────── */
interface SelectableItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  url?: string;
  mimeType?: string;
  sizeInKiloBytes?: number;
  createdAt?: string;
  available: boolean;
  archivePath?: string;
  ancestorFolderIds?: string[];
  depth?: number;
  descendantFileCount?: number;
}

type SortBy = 'name' | 'size' | 'date';
type ViewMode = 'list' | 'grid';

interface FlatTeachingNode extends ApiItem {
  path: string;
  depth: number;
  ancestorFolderIds: string[];
}

function parseDateMs(date?: string): number {
  if (!date) return 0;
  const ts = Date.parse(date);
  return Number.isFinite(ts) ? ts : 0;
}

function scoreRecordShape(record: Record<string, unknown>): number {
  let score = 0;
  if (typeof record.url === 'string' || typeof record.downloadUrl === 'string' || typeof record.href === 'string' || typeof record.link === 'string') score += 4;
  if (typeof record.description === 'string' || typeof record.title === 'string' || typeof record.name === 'string') score += 2;
  if (typeof record.mimeType === 'string') score += 1;
  if (typeof record.sizeInKiloBytes === 'number') score += 1;
  if (record.uploadedAt != null || record.createdAt != null || record.date != null) score += 1;
  if (record.deletedAt != null) score += 1;
  return score;
}

function extractBestRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (!value || typeof value !== 'object') return [];

  const preferredObj = value as Record<string, unknown>;
  const preferredCandidates = [
    preferredObj.assignments,
    preferredObj.items,
    preferredObj.files,
    preferredObj.data,
    preferredObj.results,
    preferredObj.content,
    preferredObj.list,
  ];
  for (const candidate of preferredCandidates) {
    if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
  }

  type Candidate = { records: Array<Record<string, unknown>>; score: number };
  const candidates: Candidate[] = [];
  const queue: Array<{ node: unknown; depth: number }> = [{ node: value, depth: 0 }];

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    const { node, depth } = current;
    if (depth > 4 || node == null) continue;

    if (Array.isArray(node)) {
      const records = node.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null);
      if (records.length > 0) {
        const score = records.reduce((acc, record) => acc + scoreRecordShape(record), 0);
        candidates.push({ records, score });
      }
      node.forEach((entry) => queue.push({ node: entry, depth: depth + 1 }));
      continue;
    }

    if (typeof node === 'object') {
      Object.values(node as Record<string, unknown>).forEach((entry) => {
        queue.push({ node: entry, depth: depth + 1 });
      });
    }
  }

  if (candidates.length === 0) return [];

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.records.length - a.records.length;
  });

  return candidates[0].records;
}

function toRecordArray(value: unknown): Array<Record<string, unknown>> {
  return extractBestRecordArray(value);
}

function toProxyableUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const value = rawUrl.trim();
  if (!value) return undefined;

  if (value.startsWith('/api/polito/')) return value;
  if (value.startsWith('/api/')) return `/api/polito/${value.replace(/^\/api\/?/, '')}`;
  if (value.startsWith('/courses/')) return `/api/polito${value}`;

  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith('/api/')) {
      const apiPath = parsed.pathname.replace(/^\/api\/?/, '');
      return `/api/polito/${apiPath}${parsed.search}`;
    }
  } catch {
    // Not an absolute URL; keep as-is.
  }

  return value;
}

function buildTeachingMetrics(items: ApiItem[]) {
  const sizeById = new Map<string, number>();
  const dateById = new Map<string, number>();

  const walk = (item: ApiItem): { size: number; date: number } => {
    if (item.type === 'file') {
      const size = item.sizeInKiloBytes ?? 0;
      const date = parseDateMs(item.createdAt);
      sizeById.set(item.id, size);
      dateById.set(item.id, date);
      return { size, date };
    }

    const children = item.files ?? [];
    let size = 0;
    let date = parseDateMs(item.createdAt);
    for (const child of children) {
      const childMetrics = walk(child);
      size += childMetrics.size;
      date = Math.max(date, childMetrics.date);
    }
    sizeById.set(item.id, size);
    dateById.set(item.id, date);
    return { size, date };
  };

  items.forEach(walk);
  return { sizeById, dateById };
}

function compareTreeItems(
  a: ApiItem,
  b: ApiItem,
  sortBy: SortBy,
  sizeById: Map<string, number>,
  dateById: Map<string, number>,
) {
  if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;

  if (sortBy === 'size') {
    const diff = (sizeById.get(b.id) ?? 0) - (sizeById.get(a.id) ?? 0);
    if (diff !== 0) return diff;
  }

  if (sortBy === 'date') {
    const diff = (dateById.get(b.id) ?? 0) - (dateById.get(a.id) ?? 0);
    if (diff !== 0) return diff;
  }

  return a.name.localeCompare(b.name);
}

function sortTreeItems(
  items: ApiItem[],
  sortBy: SortBy,
  sizeById: Map<string, number>,
  dateById: Map<string, number>,
): ApiItem[] {
  return [...items]
    .sort((a, b) => compareTreeItems(a, b, sortBy, sizeById, dateById))
    .map((item) => item.type === 'directory'
      ? { ...item, files: sortTreeItems(item.files ?? [], sortBy, sizeById, dateById) }
      : item);
}

function flattenAllTeachingNodes(
  items: ApiItem[],
  depth = 0,
  parentPath = '',
  ancestorFolderIds: string[] = [],
): FlatTeachingNode[] {
  const result: FlatTeachingNode[] = [];
  for (const item of items) {
    const path = parentPath ? `${parentPath}/${item.name}` : item.name;
    result.push({ ...item, path, depth, ancestorFolderIds });
    if (item.type === 'directory' && item.files?.length) {
      result.push(...flattenAllTeachingNodes(
        item.files,
        depth + 1,
        path,
        [...ancestorFolderIds, item.id],
      ));
    }
  }
  return result;
}

function flattenVisibleTeachingNodes(
  items: ApiItem[],
  expandedFolders: Set<string>,
  depth = 0,
  parentPath = '',
  ancestorFolderIds: string[] = [],
): FlatTeachingNode[] {
  const result: FlatTeachingNode[] = [];
  for (const item of items) {
    const path = parentPath ? `${parentPath}/${item.name}` : item.name;
    result.push({ ...item, path, depth, ancestorFolderIds });
    if (item.type === 'directory' && expandedFolders.has(item.id) && item.files?.length) {
      result.push(...flattenVisibleTeachingNodes(
        item.files,
        expandedFolders,
        depth + 1,
        path,
        [...ancestorFolderIds, item.id],
      ));
    }
  }
  return result;
}

/* ─── row checkbox ────────────────────────────────────────────────── */
function RowCheckbox({ checked, indeterminate = false, anySelected, onClick }: {
  checked: boolean;
  indeterminate?: boolean;
  anySelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <span
      onClick={onClick}
      className={`shrink-0 w-4 h-4 flex items-center justify-center rounded transition-all cursor-pointer
        ${anySelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        ${checked ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
    >
      {checked
        ? <CheckSquare2 className="w-4 h-4" />
        : indeterminate
          ? <CheckSquare2 className="w-4 h-4 text-primary/60" />
        : <Square className="w-4 h-4" />}
    </span>
  );
}

/* ─── selection action bar ────────────────────────────────────────── */
function SelectionBar({
  totalCount,
  selectedCount,
  onDownload,
  onSelectAll,
  onClear,
  isDownloading,
}: {
  totalCount: number;
  selectedCount: number;
  onDownload: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  isDownloading: boolean;
}) {
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const indeterminate = selectedCount > 0 && selectedCount < totalCount;

  return (
    <div
      className={`absolute bottom-0 inset-x-0 z-20 border-t border-border bg-card/95 backdrop-blur-sm px-2 py-1.5 flex items-center gap-1 transition-all duration-200 ${totalCount > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
        }`}
    >
      <button
        onClick={allSelected ? onClear : onSelectAll}
        className="shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        title={allSelected ? 'Deselect all' : 'Select all'}
      >
        {allSelected
          ? <CheckSquare2 className="w-4 h-4 text-primary" />
          : indeterminate
            ? <CheckSquare2 className="w-4 h-4 text-primary/50" />
            : <Square className="w-4 h-4" />}
      </button>
      <span className="text-xs font-semibold text-foreground tabular-nums flex-1 pl-1">
        {selectedCount > 0
          ? `${selectedCount} of ${totalCount} selected`
          : `${totalCount} item${totalCount !== 1 ? 's' : ''}`}
      </span>
      <button
        onClick={onSelectAll}
        className="text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-muted/60 transition-colors"
      >
        All
      </button>
      <button
        onClick={onDownload}
        disabled={isDownloading}
        className="flex items-center gap-1 text-[11px] font-medium bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded transition-colors disabled:opacity-50"
      >
        {isDownloading
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <Download className="h-3 w-3" />}
        Download
      </button>
      {selectedCount > 0 && (
        <button
          onClick={onClear}
          className="text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-muted/60 transition-colors"
          title="Clear selection (Esc)"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/* ─── lazy PDF viewer ─────────────────────────────────────────────── */
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

/* ─── lazy custom video player ─────────────────────────────────────── */
const VideoPlayer = dynamic(() => import('./VideoPlayer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-black">
      <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin" />
    </div>
  ),
});

/* ─── media preview ───────────────────────────────────────────────── */
function MediaPreview({ file, courseId, onClose }: { file: SelectedFile; courseId: string; onClose: () => void }) {
  const kind = getFileKind(file.mimeType, file.name);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Video and audio: use the URL directly — no fetch needed (avoids CORS on external streams)
    if (kind === 'video' || kind === 'audio') {
      setBlobUrl(file.url);
      setLoading(false);
      return;
    }

    let objUrl: string | null = null;
    setLoading(true); setError(null); setBlobUrl(null); setText(null);

    (async () => {
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (kind === 'text' || kind === 'code') {
          setText(await res.text());
        } else {
          const blob = await res.blob();
          objUrl = URL.createObjectURL(blob);
          setBlobUrl(objUrl);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();

    return () => { if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [file.url, kind]);

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
      <h2 className="text-sm font-semibold truncate flex-1 min-w-0">{file.name}</h2>
      <div className="flex items-center gap-1 ml-4 shrink-0">
        {blobUrl && (
          <Button variant="ghost" size="icon" asChild>
            <a href={blobUrl} download={file.name}><Download className="h-4 w-4" /></a>
          </Button>
        )}
        {file.externalUrl && (
          <Button variant="ghost" size="icon" asChild>
            <a href={file.externalUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onClose}>
          <span className="text-sm text-muted-foreground">✕</span>
        </Button>
      </div>
    </div>
  );

  if (loading) return <div className="h-full flex flex-col">{header}<div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></div>;

  if (error) return (
    <div className="h-full flex flex-col">{header}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-medium text-foreground">Failed to load file</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        {(file.externalUrl || file.url) && (
          <Button asChild><a href={file.externalUrl ?? file.url} target="_blank" rel="noreferrer" download={file.name}><Download className="h-4 w-4 mr-2" />Download</a></Button>
        )}
      </div>
    </div>
  );

  if (kind === 'image' && blobUrl) return (
    <div className="h-full flex flex-col">{header}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={blobUrl} alt={file.name} className="max-w-full max-h-full object-contain rounded-md shadow-md" />
      </div>
    </div>
  );

  if (kind === 'audio' && blobUrl) return (
    <div className="h-full flex flex-col">{header}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <Music className="h-20 w-20 text-muted-foreground/20" />
        <p className="font-medium">{file.name}</p>
        <audio src={blobUrl} controls className="w-full max-w-md" />
      </div>
    </div>
  );

  if ((kind === 'text' || kind === 'code') && text !== null) return (
    <div className="h-full flex flex-col">{header}
      <ScrollArea className="flex-1">
        <pre className="p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words text-foreground">{text}</pre>
      </ScrollArea>
    </div>
  );

  return (
    <div className="h-full flex flex-col">{header}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <FileIcon mimeType={file.mimeType} name={file.name} className="w-16 h-16" />
        <div>
          <h3 className="text-lg font-semibold">{file.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">Preview not available</p>
        </div>
        <Button asChild><a href={file.url} target="_blank" rel="noreferrer" download={file.name}><Download className="h-4 w-4 mr-2" />Download</a></Button>
      </div>
    </div>
  );
}

/* ─── tree node (teaching material) ──────────────────────────────── */
function TreeNode({
  item, depth, expandedFolders, onToggleFolder, selectedFileId, onSelectFile,
  selection, anySelected, onToggleSelect,
  folderSelectionState,
  folderFileCounts,
}: {
  item: ApiItem; depth: number; expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void; selectedFileId: string | null;
  onSelectFile: (item: ApiItem, e: React.MouseEvent) => void;
  selection: Set<string>; anySelected: boolean;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  folderSelectionState: Map<string, { checked: boolean; indeterminate: boolean }>;
  folderFileCounts: Map<string, number>;
}) {
  const indent = depth * 12;

  if (item.type === 'directory') {
    const isExpanded = expandedFolders.has(item.id);
    const folderState = folderSelectionState.get(item.id) ?? { checked: false, indeterminate: false };
    const children = item.files ?? [];
    return (
      <div>
        <button onClick={() => onToggleFolder(item.id)} style={{ paddingLeft: `${8 + indent}px` }}
          className="w-full flex items-center gap-1.5 pr-2.5 py-1.5 rounded-md text-sm hover:bg-muted/60 transition-colors text-left group">
          <RowCheckbox
            checked={folderState.checked}
            indeterminate={folderState.indeterminate}
            anySelected={anySelected}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id, e.shiftKey); }}
          />
          <span className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
          {isExpanded ? <FolderOpen className="h-4 w-4 shrink-0 text-primary" /> : <Folder className="h-4 w-4 shrink-0 text-primary fill-primary/20" />}
          <span className="truncate flex-1 font-medium">{item.name}</span>
          {children.length > 0 && <span className="text-[10px] text-muted-foreground/40 shrink-0">{children.length} Items</span>}
        </button>
        {isExpanded && (
          <div>
            {children.length === 0
              ? <div style={{ paddingLeft: `${20 + indent}px` }} className="py-1.5 pr-2"><span className="text-xs text-muted-foreground/40 italic">Empty</span></div>
              : children.map(child => (
                <TreeNode key={child.id} item={child} depth={depth + 1}
                  expandedFolders={expandedFolders} onToggleFolder={onToggleFolder}
                  selectedFileId={selectedFileId} onSelectFile={onSelectFile}
                  selection={selection} anySelected={anySelected} onToggleSelect={onToggleSelect}
                  folderSelectionState={folderSelectionState}
                  folderFileCounts={folderFileCounts}
                />
              ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedFileId === item.id;
  const isChecked = selection.has(item.id);
  return (
    <button
      onClick={(e) => onSelectFile(item, e)}
      style={{ paddingLeft: `${8 + indent}px` }}
      className={`group w-full flex items-center gap-2 pr-2.5 py-2 rounded-md text-sm transition-colors text-left ${isChecked ? 'bg-primary/10 text-foreground' : isSelected ? 'bg-muted/80 text-foreground' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
        }`}
    >
      <RowCheckbox
        checked={isChecked}
        anySelected={anySelected}
        onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id, e.shiftKey); }}
      />
      <FileIcon mimeType={item.mimeType} name={item.name} />
      <span className="truncate flex-1 min-w-0">{item.name}</span>
      {item.sizeInKiloBytes ? <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0">{formatBytes(item.sizeInKiloBytes)}</span> : null}
    </button>
  );
}
const TAB_LABELS: Record<MaterialsActiveTab, string> = {
  teaching: 'Materials',
  dropbox: 'Dropbox',
  virtual: 'Recordings',
};

function SidebarHeader({
  activeTab,
  onTabChange,
  onCollapse,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: {
  activeTab: MaterialsActiveTab;
  onTabChange: (tab: MaterialsActiveTab) => void;
  onCollapse: () => void;
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const activeTabIcon = activeTab === 'teaching'
    ? <FolderOpen className="h-3.5 w-3.5 text-primary" />
    : activeTab === 'dropbox'
      ? <Package className="h-3.5 w-3.5 text-blue-500" />
      : <Monitor className="h-3.5 w-3.5 text-blue-500" />;

  return (
    <div className="border-b border-border shrink-0">
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <div className="flex h-8 min-w-[128px] items-center gap-1 rounded-md border border-border bg-background px-1.5">
          {activeTabIcon}
          <select
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value as MaterialsActiveTab)}
            className="h-full w-full min-w-0 border-0 bg-transparent px-0 text-[11px] font-medium text-foreground focus:ring-0"
            aria-label="Materials section"
          >
            {(['teaching', 'dropbox', 'virtual'] as MaterialsActiveTab[]).map((tab) => (
              <option key={tab} value={tab}>{TAB_LABELS[tab]}</option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[68px]  h-8 items-center rounded-md border border-border overflow-hidden">
          <button
            onClick={() => onViewModeChange('list')}
            className={`flex h-full w-8 items-center justify-center p-0 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`flex h-full w-8 items-center justify-center p-0 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}
            title="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex h-8 min-w-[98px] items-center gap-1 rounded-md border border-border bg-background px-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            id="materials-sort"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className="h-full w-full min-w-0 border-0 bg-transparent px-0 text-[11px] text-foreground focus:ring-0"
            aria-label="Sort materials"
          >
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="date">Date</option>
          </select>
        </div>

        <button
          onClick={onCollapse}
          className="ml-auto h-8 w-8 shrink-0 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Hide sidebar"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── main component ──────────────────────────────────────────────── */
export default function MaterialsTab({
  courseId,
  year,
  initialTab = 'teaching',
}: {
  courseId: string;
  year?: string;
  initialTab?: MaterialsActiveTab;
}) {
  const [activeTab, setActiveTab] = useState<MaterialsActiveTab>(initialTab);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const numericId = parseInt(courseId, 10);

  // Data for all tabs — let react-query cache them
  const { data: rootItems = [], isLoading: filesLoading, isFetching: filesFetching } = useGetCourseFiles(numericId, year);
  const { data: assignments = [], isLoading: assignLoading } = useGetCourseAssignments(numericId);
  const { data: virtualClassrooms = [], isLoading: vcLoading } = useGetCourseVirtualClassrooms(numericId);
  const { data: videolectures = [], isLoading: vlLoading } = useGetCourseVideolectures(numericId);

  // Teaching material state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);

  // ── Batch selection ──────────────────────────────────────────────
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const lastSelectedIdRef = useRef<string | null>(null);
  const [gridFolderStack, setGridFolderStack] = useState<string[]>([]);
  const breadcrumbScrollRef = useRef<HTMLDivElement | null>(null);

  // Sidebar panel
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sidebarRef = usePanelRef();
  const sidebarOnResize = useSnapOnRelease(sidebarRef, SIDEBAR_SNAPS, () => setIsSidebarCollapsed(true));

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toString = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;
  const toNumber = (value: unknown): number | undefined => typeof value === 'number' ? value : undefined;

  const sortSelectableItems = useCallback((items: SelectableItem[]) => {
    return [...items].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;

      if (sortBy === 'size') {
        const diff = (b.sizeInKiloBytes ?? 0) - (a.sizeInKiloBytes ?? 0);
        if (diff !== 0) return diff;
      }

      if (sortBy === 'date') {
        const diff = parseDateMs(b.createdAt) - parseDateMs(a.createdAt);
        if (diff !== 0) return diff;
      }

      return a.name.localeCompare(b.name);
    });
  }, [sortBy]);

  const teachingRootItems = Array.isArray(rootItems) ? (rootItems as ApiItem[]) : [];
  const teachingMetrics = useMemo(() => buildTeachingMetrics(teachingRootItems), [teachingRootItems]);
  const sortedRootItems = useMemo(
    () => sortTreeItems(
      teachingRootItems,
      sortBy,
      teachingMetrics.sizeById,
      teachingMetrics.dateById,
    ),
    [teachingRootItems, sortBy, teachingMetrics],
  );

  const allTeachingNodes = useMemo(() => flattenAllTeachingNodes(sortedRootItems), [sortedRootItems]);
  const { descendantIdsByFolder, descendantFileIdsByFolder } = useMemo(() => {
    const idsMap = new Map<string, string[]>();
    const filesMap = new Map<string, string[]>();

    allTeachingNodes.forEach((node) => {
      if (node.type === 'directory') {
        idsMap.set(node.id, [node.id]);
        filesMap.set(node.id, []);
      }
    });

    allTeachingNodes.forEach((node) => {
      node.ancestorFolderIds.forEach((folderId) => {
        const branchIds = idsMap.get(folderId);
        if (branchIds) branchIds.push(node.id);
        if (node.type === 'file') {
          const branchFiles = filesMap.get(folderId);
          if (branchFiles) branchFiles.push(node.id);
        }
      });
    });

    return { descendantIdsByFolder: idsMap, descendantFileIdsByFolder: filesMap };
  }, [allTeachingNodes]);

  const teachingSelectableAll = useMemo((): SelectableItem[] => {
    return allTeachingNodes.map((node) => {
      if (node.type === 'file') {
        return {
          id: node.id,
          name: node.name,
          type: 'file',
          url: `/api/polito/courses/${courseId}/files/${node.id}`,
          mimeType: node.mimeType,
          sizeInKiloBytes: node.sizeInKiloBytes,
          createdAt: node.createdAt,
          available: true,
          archivePath: node.path,
          ancestorFolderIds: node.ancestorFolderIds,
          depth: node.depth,
        };
      }

      const descendantFiles = descendantFileIdsByFolder.get(node.id) ?? [];
      return {
        id: node.id,
        name: node.name,
        type: 'directory',
        sizeInKiloBytes: teachingMetrics.sizeById.get(node.id) ?? 0,
        createdAt: node.createdAt,
        available: descendantFiles.length > 0,
        archivePath: node.path,
        ancestorFolderIds: node.ancestorFolderIds,
        depth: node.depth,
        descendantFileCount: descendantFiles.length,
      };
    });
  }, [allTeachingNodes, courseId, descendantFileIdsByFolder, teachingMetrics]);

  const teachingById = useMemo(() => {
    const byId = new Map<string, SelectableItem>();
    teachingSelectableAll.forEach((item) => byId.set(item.id, item));
    return byId;
  }, [teachingSelectableAll]);

  useEffect(() => {
    setGridFolderStack((prev) => {
      let nodes: ApiItem[] = sortedRootItems;
      const next: string[] = [];

      for (const folderId of prev) {
        const match = nodes.find((node) => node.type === 'directory' && node.id === folderId);
        if (!match || match.type !== 'directory') break;
        next.push(folderId);
        nodes = match.files ?? [];
      }

      return next.length === prev.length ? prev : next;
    });
  }, [sortedRootItems]);

  const teachingGridContext = useMemo(() => {
    const breadcrumb: Array<{ id: string | null; name: string }> = [{ id: null, name: 'Materials' }];
    let nodes: ApiItem[] = sortedRootItems;

    for (const folderId of gridFolderStack) {
      const folder = nodes.find((node) => node.type === 'directory' && node.id === folderId);
      if (!folder || folder.type !== 'directory') break;
      breadcrumb.push({ id: folder.id, name: folder.name });
      nodes = folder.files ?? [];
    }

    return { breadcrumb, nodes };
  }, [gridFolderStack, sortedRootItems]);

  const teachingGridItems = useMemo(
    () => teachingGridContext.nodes
      .map((node) => teachingById.get(node.id))
      .filter((item): item is SelectableItem => Boolean(item)),
    [teachingById, teachingGridContext.nodes],
  );

  useEffect(() => {
    if (activeTab !== 'teaching' || viewMode !== 'grid') return;
    const el = breadcrumbScrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [activeTab, viewMode, teachingGridContext.breadcrumb.length]);

  const assignmentEntries = useMemo(() => {
    const raw = toRecordArray(assignments);
    const mapped = raw.map((assignment, i) => {
      const rawId = assignment.id;
      const id = String(rawId ?? `assignment-${i}`);
      const apiId = rawId == null ? undefined : String(rawId);
      const name =
        toString(assignment.name) ??
        toString(assignment.title) ??
        toString(assignment.description) ??
        `Assignment ${i + 1}`;

      const apiProvidedUrl =
        toString(assignment.url) ??
        toString(assignment.downloadUrl) ??
        toString(assignment.href) ??
        toString(assignment.link);

      const fallbackUrl = apiId
        ? `/api/polito/courses/${courseId}/assignments/${encodeURIComponent(apiId)}`
        : undefined;

      const url = toProxyableUrl(apiProvidedUrl) ?? fallbackUrl;

      return {
        id,
        name,
        type: 'file' as const,
        url,
        mimeType: toString(assignment.mimeType),
        sizeInKiloBytes: toNumber(assignment.sizeInKiloBytes),
        createdAt: toString(assignment.createdAt) ?? toString(assignment.date),
        available: Boolean(url),
      };
    });
    return sortSelectableItems(mapped);
  }, [assignments, courseId, sortSelectableItems]);

  const dropboxFileFallbackEntries = useMemo(() => {
    const allFromTeaching = teachingSelectableAll
      .filter((item) => item.type === 'file' && item.available)
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: 'file' as const,
        url: item.url,
        mimeType: item.mimeType,
        sizeInKiloBytes: item.sizeInKiloBytes,
        createdAt: item.createdAt,
        available: Boolean(item.url),
      }));

    const likelyDropbox = allFromTeaching.filter((item) => {
      const path = (item.name + ' ' + (item.url ?? '')).toLowerCase();
      const archivePath = (teachingSelectableAll.find((entry) => entry.id === item.id)?.archivePath ?? '').toLowerCase();
      const full = `${archivePath} ${path}`;
      return full.includes('dropbox') || full.includes('elaborat') || full.includes('assign') || full.includes('conseg');
    });

    return sortSelectableItems(likelyDropbox);
  }, [sortSelectableItems, teachingSelectableAll]);

  const dropboxEntries = useMemo(() => {
    if (assignmentEntries.length > 0) return assignmentEntries;
    return dropboxFileFallbackEntries;
  }, [assignmentEntries, dropboxFileFallbackEntries]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (activeTab !== 'dropbox') return;

    const payloadType = Array.isArray(assignments) ? 'array' : typeof assignments;
    const rootPreview = sortedRootItems.slice(0, 5).map((item) => ({ id: item.id, name: item.name, type: item.type }));

    console.info('[MaterialsTab][Dropbox Debug]', {
      courseId,
      year,
      payloadType,
      assignmentRawCount: Array.isArray(assignments) ? assignments.length : undefined,
      assignmentEntries: assignmentEntries.length,
      fallbackEntries: dropboxFileFallbackEntries.length,
      finalEntries: dropboxEntries.length,
      rootPreview,
    });
  }, [activeTab, assignmentEntries.length, assignments, courseId, dropboxEntries.length, dropboxFileFallbackEntries.length, sortedRootItems, year]);

  const recordingEntries = useMemo(() => {
    const vc = Array.isArray(virtualClassrooms) ? (virtualClassrooms as Array<Record<string, unknown>>) : [];
    const vl = Array.isArray(videolectures) ? (videolectures as Array<Record<string, unknown>>) : [];
    const raw = [...vc, ...vl];
    const mapped = raw.map((recording, i) => {
      const rawId = recording.id;
      const id = String(rawId ?? `recording-${i}`);
      const title = toString(recording.title) ?? toString(recording.name) ?? `Recording ${i + 1}`;
      const url = toString(recording.url) ?? toString(recording.streamUrl) ?? toString(recording.videoUrl);
      const createdAt = toString(recording.date) ?? toString(recording.createdAt) ?? toString(recording.recordingDate);
      return {
        id,
        name: title,
        type: 'file' as const,
        url,
        mimeType: 'video/mp4',
        createdAt,
        available: Boolean(url),
      };
    });
    return sortSelectableItems(mapped);
  }, [sortSelectableItems, videolectures, virtualClassrooms]);

  const activeSelectableItems = useMemo(() => {
    if (activeTab === 'teaching') return teachingSelectableAll;
    if (activeTab === 'dropbox') return dropboxEntries;
    return recordingEntries;
  }, [activeTab, dropboxEntries, recordingEntries, teachingSelectableAll]);

  const activeSelectableById = useMemo(() => {
    const byId = new Map<string, SelectableItem>();
    activeSelectableItems.forEach((item) => byId.set(item.id, item));
    return byId;
  }, [activeSelectableItems]);

  const flatIds = useCallback(() => activeSelectableItems.map((item) => item.id), [activeSelectableItems]);

  const toggleSelect = useCallback((id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      const current = activeSelectableById.get(id);

      if (activeTab === 'teaching' && current?.type === 'directory') {
        const branchIds = descendantIdsByFolder.get(id) ?? [id];
        const allInBranchSelected = branchIds.every((branchId) => next.has(branchId));
        branchIds.forEach((branchId) => {
          if (allInBranchSelected) next.delete(branchId);
          else next.add(branchId);
        });
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }

      return next;
    });
    lastSelectedIdRef.current = id;
  }, [activeSelectableById, activeTab, descendantIdsByFolder]);

  // ── range select ───────────────────────────────────────────────
  const rangeSelect = useCallback((toId: string) => {
    const ids = flatIds();
    const fromId = lastSelectedIdRef.current;
    if (!fromId) { toggleSelect(toId); return; }
    const a = ids.indexOf(fromId);
    const b = ids.indexOf(toId);
    if (a === -1 || b === -1) { toggleSelect(toId); return; }
    const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
    setSelection(prev => {
      const next = new Set(prev);
      ids.slice(lo, hi + 1).forEach(id => next.add(id));
      return next;
    });
    lastSelectedIdRef.current = toId;
  }, [flatIds, toggleSelect]);

  // ── handle file row click (teaching tree + flat lists) ─────────
  const handleItemClick = useCallback((
    item: SelectableItem,
    e: React.MouseEvent,
    openPreview: () => void,
  ) => {
    const meta = e.metaKey || e.ctrlKey;
    const shift = e.shiftKey;

    if (meta) {
      e.preventDefault();
      toggleSelect(item.id);
      return;
    }
    if (shift) {
      e.preventDefault();
      rangeSelect(item.id);
      return;
    }
    // plain click: clear selection, open preview
    setSelection(new Set());
    lastSelectedIdRef.current = item.id;
    openPreview();
  }, [toggleSelect, rangeSelect]);

  const openPreviewFromItem = useCallback((item: SelectableItem) => {
    if (item.type !== 'file' || !item.url) return;
    setSelectedFile({
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      url: item.url,
      externalUrl: activeTab === 'virtual' ? item.url : undefined,
    });
  }, [activeTab]);

  // ── select all ────────────────────────────────────────────────
  const selectAll = useCallback(() => {
    setSelection(new Set(flatIds()));
  }, [flatIds]);

  // ── clear selection ───────────────────────────────────────────
  const clearSelection = useCallback(() => {
    setSelection(new Set());
    lastSelectedIdRef.current = null;
  }, []);

  // ── keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') { clearSelection(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [clearSelection, selectAll]);

  // ── download selected ─────────────────────────────────────────
  const downloadSelected = useCallback(async () => {
    const selectedFiles: SelectableItem[] = [];

    if (activeTab === 'teaching') {
      const uniqueFiles = new Map<string, SelectableItem>();
      teachingSelectableAll.forEach((item) => {
        if (item.type !== 'file' || !item.available || !item.url) return;
        const selectedDirectly = selection.has(item.id);
        const selectedByFolder = (item.ancestorFolderIds ?? []).some((folderId) => selection.has(folderId));
        if (selectedDirectly || selectedByFolder) uniqueFiles.set(item.id, item);
      });
      selectedFiles.push(...uniqueFiles.values());
    } else {
      activeSelectableItems.forEach((item) => {
        if (item.type !== 'file') return;
        if (!selection.has(item.id)) return;
        if (!item.available || !item.url) return;
        selectedFiles.push(item);
      });
    }

    if (!selectedFiles.length) return;

    setIsDownloading(true);
    try {
      const response = await fetch('/api/materials/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archiveName: `${TAB_LABELS[activeTab].toLowerCase()}-${courseId}.zip`,
          files: selectedFiles.map((item) => ({
            url: item.url,
            name: item.name,
            archivePath: item.archivePath ?? item.name,
          })),
        }),
      });

      if (!response.ok) throw new Error(`ZIP creation failed (${response.status})`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${TAB_LABELS[activeTab].toLowerCase()}-${courseId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // keep UI responsive; user can retry.
    } finally {
      setIsDownloading(false);
    }
  }, [activeSelectableItems, activeTab, courseId, selection, teachingSelectableAll]);

  // clear selection when changing tab
  const onTabChange = (tab: MaterialsActiveTab) => {
    setActiveTab(tab);
    setSelectedFile(null);
    clearSelection();
    setGridFolderStack([]);
  };

  const openGridFolder = (folderId: string) => {
    setGridFolderStack((prev) => [...prev, folderId]);
  };

  const openGridCrumb = (index: number) => {
    setGridFolderStack((prev) => prev.slice(0, index));
  };

  const goGridParent = () => {
    setGridFolderStack((prev) => prev.slice(0, -1));
  };

  // ── sidebar content ──────────────────────────────────────────────
  const sidebarLoading =
    (activeTab === 'teaching' && filesLoading) ||
    (activeTab === 'dropbox' && assignLoading && filesLoading) ||
    (activeTab === 'virtual' && (vcLoading || vlLoading));

  const activeSelectedCount = useMemo(
    () => activeSelectableItems.filter((item) => selection.has(item.id)).length,
    [activeSelectableItems, selection],
  );

  const anySelected = activeSelectedCount > 0;

  const folderFileCounts = useMemo(() => {
    const map = new Map<string, number>();
    descendantFileIdsByFolder.forEach((value, key) => map.set(key, value.length));
    return map;
  }, [descendantFileIdsByFolder]);

  const folderSelectionState = useMemo(() => {
    const state = new Map<string, { checked: boolean; indeterminate: boolean }>();
    teachingSelectableAll.forEach((item) => {
      if (item.type !== 'directory') return;
      const branchIds = descendantIdsByFolder.get(item.id) ?? [item.id];
      const selectedCount = branchIds.filter((id) => selection.has(id)).length;
      state.set(item.id, {
        checked: branchIds.length > 0 && selectedCount === branchIds.length,
        indeterminate: selectedCount > 0 && selectedCount < branchIds.length,
      });
    });
    return state;
  }, [descendantIdsByFolder, selection, teachingSelectableAll]);

  const renderNonTeachingListRow = (item: SelectableItem) => {
    const isChecked = selection.has(item.id);
    const isPreview = selectedFile?.id === item.id;
    const dateLabel = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const rowIcon = activeTab === 'dropbox'
      ? <Package className="h-4 w-4 shrink-0 text-blue-400" />
      : <Video className="h-4 w-4 shrink-0 text-blue-500" />;

    return (
      <button
        key={item.id}
        onClick={(e) => handleItemClick(item, e, () => openPreviewFromItem(item))}
        className={`group w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors text-left ${isChecked ? 'bg-primary/10 text-foreground' : isPreview ? 'bg-muted/80 text-foreground' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'}`}
      >
        <RowCheckbox
          checked={isChecked}
          anySelected={anySelected}
          onClick={(e) => { e.stopPropagation(); if (e.shiftKey) rangeSelect(item.id); else toggleSelect(item.id); }}
        />
        {rowIcon}
        <span className="truncate flex-1 min-w-0">{item.name}</span>
        {item.sizeInKiloBytes ? <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0">{formatBytes(item.sizeInKiloBytes)}</span> : null}
        {dateLabel ? <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0">{dateLabel}</span> : null}
      </button>
    );
  };

  const renderGridCard = (item: SelectableItem) => {
    const isChecked = selection.has(item.id);
    const isPreview = selectedFile?.id === item.id;
    const sizeLabel = item.sizeInKiloBytes ? formatBytes(item.sizeInKiloBytes) : null;
    const dateLabel = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const fileCount = item.type === 'directory' ? item.descendantFileCount ?? 0 : null;

    const onClick = (e: React.MouseEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;

      if (meta) {
        e.preventDefault();
        toggleSelect(item.id);
        return;
      }
      if (shift) {
        e.preventDefault();
        rangeSelect(item.id);
        return;
      }

      if (item.type === 'directory') {
        if (activeTab === 'teaching' && viewMode === 'grid') openGridFolder(item.id);
        else toggleFolder(item.id);
        return;
      }

      setSelection(new Set());
      lastSelectedIdRef.current = item.id;
      openPreviewFromItem(item);
    };

    return (
      <button
        key={item.id}
        onClick={onClick}
        className={`group relative w-full min-w-0 overflow-hidden rounded-md border text-left p-2 transition-colors ${isChecked ? 'border-primary bg-primary/10' : isPreview ? 'border-border bg-muted/60' : 'border-border/70 hover:bg-muted/50'}`}
      >
        <div className="absolute right-2 top-2 z-10">
          <RowCheckbox
            checked={isChecked}
            indeterminate={item.type === 'directory' ? (folderSelectionState.get(item.id)?.indeterminate ?? false) : false}
            anySelected={anySelected}
            onClick={(e) => { e.stopPropagation(); if (e.shiftKey) rangeSelect(item.id); else toggleSelect(item.id); }}
          />
        </div>
        <div className="pr-6">
          {item.type === 'directory'
            ? <Folder className="h-6 w-6 text-primary fill-primary/15" />
            : activeTab === 'virtual'
              ? <Video className="h-6 w-6 text-blue-500" />
              : activeTab === 'dropbox'
                ? <Package className="h-6 w-6 text-blue-400" />
                : <FileIcon mimeType={item.mimeType} name={item.name} className="w-6 h-6" />}
        </div>
        <p className="mt-2 min-w-0 text-xs font-medium leading-tight line-clamp-2 break-words">{item.name}</p>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/70">
          {fileCount !== null ? <span>{fileCount} files</span> : null}
          {item.type === 'directory' ? <span>Folder</span> : null}
          {sizeLabel ? <span>{sizeLabel}</span> : null}
          {dateLabel ? <span>{dateLabel}</span> : null}
        </div>
      </button>
    );
  };

  const renderSidebar = () => {
    if (sidebarLoading) {
      return (
        <div className="p-2 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 rounded-md" style={{ width: `${60 + (i % 3) * 15}%` }} />
          ))}
        </div>
      );
    }

    if (activeTab === 'teaching') {
      return filesFetching && !filesLoading ? (
        <div className="p-2 space-y-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-7 rounded-md" style={{ width: `${65 + (i % 3) * 12}%` }} />
          ))}
        </div>
      ) : sortedRootItems.length === 0 ? (
        <div className="py-10 text-center">
          <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground">No files available</p>
        </div>
      ) : viewMode === 'list' ? sortedRootItems.map((item) => (
        <TreeNode
          key={item.id}
          item={item}
          depth={0}
          expandedFolders={expandedFolders}
          onToggleFolder={toggleFolder}
          selectedFileId={selectedFile?.id ?? null}
          onSelectFile={(treeItem, e) =>
            handleItemClick(
              {
                id: treeItem.id,
                name: treeItem.name,
                type: 'file',
                url: `/api/polito/courses/${courseId}/files/${treeItem.id}`,
                mimeType: treeItem.mimeType,
                sizeInKiloBytes: treeItem.sizeInKiloBytes,
                createdAt: treeItem.createdAt,
                available: true,
              },
              e,
              () => setSelectedFile({
                id: treeItem.id,
                name: treeItem.name,
                mimeType: treeItem.mimeType,
                url: `/api/polito/courses/${courseId}/files/${treeItem.id}`,
              }),
            )
          }
          selection={selection}
          anySelected={anySelected}
          onToggleSelect={(id, shiftKey) => {
            if (shiftKey) rangeSelect(id);
            else toggleSelect(id);
          }}
          folderSelectionState={folderSelectionState}
          folderFileCounts={folderFileCounts}
        />
      )) : (
        <div className="w-full min-w-0 overflow-x-hidden p-1.5 space-y-2">
          <div className="flex w-full min-w-0 items-center gap-1 rounded-md border border-border bg-muted/30 px-1 py-0.5">
            <button
              onClick={goGridParent}
              disabled={gridFolderStack.length === 0}
              className="h-6 w-6 shrink-0 rounded-md border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-background"
              title="Go to parent folder"
            >
              <ChevronLeft className="h-3.5 w-3.5 mx-auto" />
            </button>
            <div
              ref={breadcrumbScrollRef}
              onWheel={(e) => {
                if (!breadcrumbScrollRef.current) return;
                breadcrumbScrollRef.current.scrollLeft += e.deltaY;
              }}
              className="flex flex-1 min-w-0 max-w-full items-center gap-0.5 overflow-x-auto overflow-y-hidden whitespace-nowrap overscroll-x-contain scroll-smooth"
            >
              {teachingGridContext.breadcrumb.map((crumb, index) => (
                <div key={crumb.id ?? 'root'} className="flex items-center gap-0.5 shrink-0">
                  {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                  <button
                    onClick={() => openGridCrumb(index)}
                    className={`px-1.5 py-0.5 text-[10px] leading-none rounded-md transition-colors ${index === teachingGridContext.breadcrumb.length - 1 ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'}`}
                    title={crumb.name}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {teachingGridItems.length === 0 ? (
            <div className="py-10 text-center">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground">This folder is empty</p>
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-2 gap-2">
              {teachingGridItems.map((item) => renderGridCard(item))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'dropbox') {
      if (dropboxEntries.length === 0) return (
        <div className="py-10 text-center px-2">
          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground">No Dropbox files from student API</p>
          <p className="mt-1 text-[11px] text-muted-foreground/70">Official portal Dropbox uses a different endpoint that is not exposed in the current app API.</p>
        </div>
      );
      return viewMode === 'list'
        ? dropboxEntries.map((item) => renderNonTeachingListRow(item))
        : <div className="grid grid-cols-2 gap-2 p-1.5">{dropboxEntries.map((item) => renderGridCard(item))}</div>;
    }

    if (activeTab === 'virtual') {
      if (recordingEntries.length === 0) return (
        <div className="py-10 text-center px-2">
          <Monitor className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground">No recordings</p>
        </div>
      );
      return viewMode === 'list'
        ? recordingEntries.map((item) => renderNonTeachingListRow(item))
        : <div className="grid grid-cols-2 gap-2 p-1.5">{recordingEntries.map((item) => renderGridCard(item))}</div>;
    }

    return null;
  };

  // ── preview content ──────────────────────────────────────────────
  const renderPreview = () => {
    if (!selectedFile) {
      const icons: Record<MaterialsActiveTab, JSX.Element> = {
        teaching: <FileText className="h-12 w-12 text-muted-foreground/20" />,
        dropbox: <Package className="h-12 w-12 text-muted-foreground/20" />,
        virtual: <Monitor className="h-12 w-12 text-muted-foreground/20" />,
      };
      const hints: Record<MaterialsActiveTab, string> = {
        teaching: 'Expand a folder and click any file',
        dropbox: 'Dropbox is shown only when API returns Dropbox-specific files',
        virtual: 'Choose a recording from the list to play it',
      };
      return (
        <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-8">
          {icons[activeTab]}
          <p className="font-medium text-foreground">Nothing selected</p>
          <p className="text-sm text-muted-foreground">{hints[activeTab]}</p>
        </div>
      );
    }

    const kind = getFileKind(selectedFile.mimeType, selectedFile.name);

    if (kind === 'pdf') {
      return <PDFViewer url={selectedFile.url} name={selectedFile.name} courseId={courseId} onClose={() => setSelectedFile(null)} />;
    }

    // Use the custom player for any video file across all tabs
    if (kind === 'video') {
      return (
        <VideoPlayer
          src={selectedFile.url}
          title={selectedFile.name}
          externalUrl={selectedFile.externalUrl}
          onClose={() => setSelectedFile(null)}
        />
      );
    }

    return <MediaPreview file={selectedFile} courseId={courseId} onClose={() => setSelectedFile(null)} />;
  };

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <ResizablePanel
        defaultSize="25%"
        minSize="180px"
        maxSize="45%"
        collapsible={true}
        collapsedSize="0px"
        panelRef={sidebarRef}
        onResize={(size: any) => {
          setIsSidebarCollapsed((size?.inPixels ?? 0) < 10);
          sidebarOnResize(size);
        }}
        className="flex flex-col border-r border-border bg-card overflow-hidden"
      >
        <SidebarHeader
          activeTab={activeTab}
          onTabChange={onTabChange}
          onCollapse={() => sidebarRef.current?.collapse()}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        {/* scroll area with pb for action bar */}
        <div className="flex-1 relative overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-1.5 pb-10">{renderSidebar()}</div>
          </ScrollArea>
          {/* ── action bar ──────────────────────────────────────── */}
          <SelectionBar
            totalCount={activeSelectableItems.length}
            selectedCount={activeSelectedCount}
            onDownload={downloadSelected}
            onSelectAll={selectAll}
            onClear={clearSelection}
            isDownloading={isDownloading}
          />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* ── Preview ───────────────────────────────────────────────── */}
      <ResizablePanel defaultSize="75%" className="flex flex-col min-w-0 relative">
        {isSidebarCollapsed && (
          <div className="absolute top-0 left-0 z-50 flex flex-col bg-card border-r border-border h-full shadow-sm">
            {/* expand icon */}
            <button
              onClick={() => { sidebarRef.current?.expand(); setIsSidebarCollapsed(false); }}
              title="Show sidebar"
              className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border-b border-border"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
            {/* vertical tab pills */}
            {(['teaching', 'dropbox', 'virtual'] as MaterialsActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { onTabChange(tab); sidebarRef.current?.expand(); setIsSidebarCollapsed(false); }}
                title={TAB_LABELS[tab]}
                className={`flex-1 flex items-center justify-center px-1.5 py-3 text-[10px] font-medium transition-colors border-b border-border last:border-b-0 ${activeTab === tab
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        )}
        <div className={`flex-1 min-w-0 overflow-hidden h-full ${isSidebarCollapsed ? 'pl-9' : ''}`}>{renderPreview()}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
