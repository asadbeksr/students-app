'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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
  PanelLeftClose, PanelLeftOpen, ChevronRight, ChevronDown, Code,
  Package, Monitor, ExternalLink, X, CheckSquare2, Square,
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
  url: string;
  mimeType?: string;
}

/* ─── flatten visible tree leaves ────────────────────────────────── */
function flattenVisibleLeaves(items: ApiItem[], expandedFolders: Set<string>): ApiItem[] {
  const result: ApiItem[] = [];
  for (const item of items) {
    if (item.type === 'file') {
      result.push(item);
    } else if (item.type === 'directory' && expandedFolders.has(item.id)) {
      const sorted = [...(item.files ?? [])].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      result.push(...flattenVisibleLeaves(sorted, expandedFolders));
    }
  }
  return result;
}

/* ─── row checkbox ────────────────────────────────────────────────── */
function RowCheckbox({ checked, anySelected, onClick }: {
  checked: boolean;
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
        : <Square className="w-4 h-4" />}
    </span>
  );
}

/* ─── selection action bar ────────────────────────────────────────── */
function SelectionBar({
  count,
  onDownload,
  onSelectAll,
  onClear,
  isDownloading,
}: {
  count: number;
  onDownload: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  isDownloading: boolean;
}) {
  return (
    <div
      className={`absolute bottom-0 inset-x-0 z-20 border-t border-border bg-card/95 backdrop-blur-sm px-2 py-1.5 flex items-center gap-1 transition-all duration-200 ${count > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
        }`}
    >
      <span className="text-xs font-semibold text-foreground tabular-nums flex-1 pl-1">
        {count} selected
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
        className="flex items-center gap-1 text-[11px] font-medium text-foreground bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded transition-colors disabled:opacity-50"
      >
        {isDownloading
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <Download className="h-3 w-3" />}
        Download
      </button>
      <button
        onClick={onClear}
        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors"
        title="Clear selection (Esc)"
      >
        <X className="h-3.5 w-3.5" />
      </button>
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
}: {
  item: ApiItem; depth: number; expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void; selectedFileId: string | null;
  onSelectFile: (item: ApiItem, e: React.MouseEvent) => void;
  selection: Set<string>; anySelected: boolean;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
}) {
  const indent = depth * 12;

  if (item.type === 'directory') {
    const isExpanded = expandedFolders.has(item.id);
    const children = [...(item.files ?? [])].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return (
      <div>
        <button onClick={() => onToggleFolder(item.id)} style={{ paddingLeft: `${8 + indent}px` }}
          className="w-full flex items-center gap-1.5 pr-2.5 py-1.5 rounded-md text-sm hover:bg-muted/60 transition-colors text-left group">
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
  totalCount,
  selectedCount,
  onSelectAll,
  onClearAll,
}: {
  activeTab: MaterialsActiveTab;
  onTabChange: (tab: MaterialsActiveTab) => void;
  onCollapse: () => void;
  totalCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const indeterminate = selectedCount > 0 && selectedCount < totalCount;
  return (
    <div className="border-b border-border shrink-0">
      {/* tab row */}
      <div className="flex items-center px-1.5 pt-1.5 gap-0.5">
        {(['teaching', 'dropbox', 'virtual'] as MaterialsActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
        <button
          onClick={onCollapse}
          className="shrink-0 p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors ml-0.5"
          title="Hide sidebar"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* select-all row */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 px-2.5 py-1 border-t border-border/50">
          <button
            onClick={allSelected ? onClearAll : onSelectAll}
            className="shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title={allSelected ? 'Deselect all' : 'Select all'}
          >
            {allSelected
              ? <CheckSquare2 className="w-4 h-4 text-primary" />
              : indeterminate
                ? <CheckSquare2 className="w-4 h-4 text-primary/50" />
                : <Square className="w-4 h-4" />}
          </button>
          <span className="text-[11px] text-muted-foreground flex-1">
            {selectedCount > 0 ? `${selectedCount} of ${totalCount} selected` : `${totalCount} item${totalCount !== 1 ? 's' : ''}`}
          </span>
          {selectedCount > 0 && (
            <button onClick={onClearAll} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          )}
        </div>
      )}
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

  const sortedRootItems = [...(rootItems as ApiItem[])].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const vcItems: any[] = Array.isArray(virtualClassrooms) ? virtualClassrooms : [];
  const vlItems: any[] = Array.isArray(videolectures) ? videolectures : [];
  const allRecordings = [
    ...vcItems.map((r: any) => ({ ...r, _src: 'vc' })),
    ...vlItems.map((r: any) => ({ ...r, _src: 'vl' })),
  ];

  const assignItems: any[] = Array.isArray(assignments) ? assignments : [];

  // ── flat list of selectable items (per tab) ────────────────────
  const allSelectableItems = useCallback((): SelectableItem[] => {
    if (activeTab === 'teaching') {
      return flattenVisibleLeaves(sortedRootItems, expandedFolders).map(item => ({
        id: item.id,
        name: item.name,
        url: `/api/polito/courses/${courseId}/files/${item.id}`,
        mimeType: item.mimeType,
      }));
    }
    if (activeTab === 'dropbox') {
      return assignItems.map((a: any, i: number) => ({
        id: String(a.id ?? i),
        name: a.name ?? a.title ?? `Assignment ${i + 1}`,
        url: `/api/polito/courses/${courseId}/assignments/${a.id}`,
        mimeType: a.mimeType,
      }));
    }
    // virtual
    return allRecordings.map((r: any, i: number) => ({
      id: String(r.id ?? i),
      name: r.title ?? r.name ?? `Recording ${i + 1}`,
      url: r.url ?? r.streamUrl ?? r.videoUrl ?? '',
      mimeType: 'video/mp4',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sortedRootItems, expandedFolders, assignItems, allRecordings, courseId]);

  // ── id-ordered list for range select ──────────────────────────
  const flatIds = useCallback(() => allSelectableItems().map(i => i.id), [allSelectableItems]);

  // ── toggle one item ────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelection(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    lastSelectedIdRef.current = id;
  }, []);

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
    const items = allSelectableItems().filter(i => selection.has(i.id));
    if (!items.length) return;
    setIsDownloading(true);
    for (const item of items) {
      try {
        const a = document.createElement('a');
        a.href = item.url;
        a.download = item.name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // small stagger to avoid browser blocking multiple downloads
        await new Promise(r => setTimeout(r, 350));
      } catch {
        // continue with others
      }
    }
    setIsDownloading(false);
  }, [allSelectableItems, selection]);

  // clear selection when changing tab
  const onTabChange = (tab: MaterialsActiveTab) => {
    setActiveTab(tab);
    setSelectedFile(null);
    clearSelection();
  };

  // ── sidebar content ──────────────────────────────────────────────
  const sidebarLoading =
    (activeTab === 'teaching' && filesLoading) ||
    (activeTab === 'dropbox' && assignLoading) ||
    (activeTab === 'virtual' && (vcLoading || vlLoading));

  const anySelected = selection.size > 0;

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
      ) : sortedRootItems.map(item => (
        <TreeNode
          key={item.id} item={item} depth={0}
          expandedFolders={expandedFolders} onToggleFolder={toggleFolder}
          selectedFileId={selectedFile?.id ?? null}
          onSelectFile={(treeItem, e) =>
            handleItemClick(
              { id: treeItem.id, name: treeItem.name, url: `/api/polito/courses/${courseId}/files/${treeItem.id}`, mimeType: treeItem.mimeType },
              e,
              () => setSelectedFile({ id: treeItem.id, name: treeItem.name, mimeType: treeItem.mimeType, url: `/api/polito/courses/${courseId}/files/${treeItem.id}` }),
            )
          }
          selection={selection}
          anySelected={anySelected}
          onToggleSelect={(id, shiftKey) => {
            if (shiftKey) rangeSelect(id);
            else toggleSelect(id);
          }}
        />
      ));
    }

    if (activeTab === 'dropbox') {
      if (assignItems.length === 0) return (
        <div className="py-10 text-center px-2">
          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground">No assignments</p>
        </div>
      );
      return assignItems.map((a: any, i: number) => {
        const id = String(a.id ?? i);
        const name = a.name ?? a.title ?? `Assignment ${i + 1}`;
        const url = `/api/polito/courses/${courseId}/assignments/${a.id}`;
        const isChecked = selection.has(id);
        const isPreview = selectedFile?.id === id;
        return (
          <button key={id}
            onClick={(e) => handleItemClick({ id, name, url, mimeType: a.mimeType }, e,
              () => setSelectedFile({ id, name, mimeType: a.mimeType, url }))}
            className={`group w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors text-left ${isChecked ? 'bg-primary/10 text-foreground' : isPreview ? 'bg-muted/80 text-foreground' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}>
            <RowCheckbox checked={isChecked} anySelected={anySelected}
              onClick={(e) => { e.stopPropagation(); if (e.shiftKey) rangeSelect(id); else toggleSelect(id); }} />
            <Package className="h-4 w-4 shrink-0 text-blue-400" />
            <span className="truncate flex-1 min-w-0">{name}</span>
            {a.sizeInKiloBytes && <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0">{formatBytes(a.sizeInKiloBytes)}</span>}
          </button>
        );
      });
    }

    if (activeTab === 'virtual') {
      if (allRecordings.length === 0) return (
        <div className="py-10 text-center px-2">
          <Monitor className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground">No recordings</p>
        </div>
      );
      return allRecordings.map((r: any, i: number) => {
        const id = String(r.id ?? i);
        const title = r.title ?? r.name ?? `Recording ${i + 1}`;
        const date = r.date ?? r.createdAt ?? r.recordingDate;
        const url = r.url ?? r.streamUrl ?? r.videoUrl ?? '';
        const isChecked = selection.has(id);
        const isPreview = selectedFile?.id === id;
        const dateLabel = date
          ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : null;
        return (
          <button key={id}
            onClick={(e) => handleItemClick({ id, name: title, url, mimeType: 'video/mp4' }, e,
              () => setSelectedFile({ id, name: title, mimeType: 'video/mp4', url, externalUrl: url }))}
            className={`group w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors text-left ${isChecked ? 'bg-primary/10 text-foreground' : isPreview ? 'bg-muted/80 text-foreground' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}>
            <RowCheckbox checked={isChecked} anySelected={anySelected}
              onClick={(e) => { e.stopPropagation(); if (e.shiftKey) rangeSelect(id); else toggleSelect(id); }} />
            <Video className="h-4 w-4 shrink-0 text-blue-500" />
            <span className="truncate flex-1 min-w-0">{title}</span>
            {dateLabel && <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0">{dateLabel}</span>}
          </button>
        );
      });
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
        dropbox: 'Click an assignment to preview or download',
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
          totalCount={allSelectableItems().length}
          selectedCount={selection.size}
          onSelectAll={selectAll}
          onClearAll={clearSelection}
        />
        {/* scroll area with pb for action bar */}
        <div className="flex-1 relative overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-1.5 pb-10">{renderSidebar()}</div>
          </ScrollArea>
          {/* ── action bar ──────────────────────────────────────── */}
          <SelectionBar
            count={selection.size}
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
