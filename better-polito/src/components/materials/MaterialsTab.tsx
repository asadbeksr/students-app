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
  LayoutGrid, List, ArrowUpDown, BookOpen, Copy, Check,
  HardDrive, Upload, Trash2, MoreVertical,
  CheckCircle2, Circle, Tag, Pencil, Plus,
} from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePanelRef } from 'react-resizable-panels';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { useMaterialStore } from '@/stores/materialStore';
import type { Material, Folder as FolderType } from '@/types';
import { useProgressStore, TAG_PALETTE, BUILTIN_COLORS, type TagProgressSummary } from '@/lib/stores/progressStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type MaterialsActiveTab = 'teaching' | 'dropbox' | 'virtual' | 'uploads';

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

/* ─── NotebookLM export modal ─────────────────────────────────────── */
function NotebookLMModal({
  urls,
  loading,
  error,
  isLocalhost,
  onClose,
}: {
  urls: { name: string; url: string }[];
  loading: boolean;
  error?: string;
  isLocalhost?: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const allText = urls.map((u) => u.url).join('\n');

  // Auto-copy all URLs to clipboard as soon as they are ready
  useEffect(() => {
    if (!loading && urls.length > 0 && !error) {
      navigator.clipboard.writeText(allText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }).catch(() => {/* ignore clipboard permission errors */});
    }
  }, [loading, urls.length, error]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyAll = async () => {
    await navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySingle = async (url: string, index: number) => {
    await navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
            {loading
              ? <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
              : <BookOpen className="h-4 w-4 text-blue-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Export to NotebookLM</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {loading
                ? 'Generating secure public links…'
                : error
                  ? 'Failed to generate links'
                  : `${urls.length} PDF${urls.length !== 1 ? 's' : ''} ready — URLs copied to clipboard!`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* loading state */}
        {loading && (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            <p className="text-sm text-muted-foreground">Creating temporary secure URLs…</p>
            <p className="text-xs text-muted-foreground/60">This only takes a second</p>
          </div>
        )}

        {/* error state */}
        {!loading && error && (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-medium text-destructive">Could not generate links</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {/* ready state */}
        {!loading && !error && urls.length > 0 && (
          <>
            {/* localhost warning */}
            {isLocalhost && (
              <div className="mx-5 mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-2">
                <p className="text-[12px] font-semibold text-amber-400">⚠ App is running on localhost</p>
                <p className="text-[11px] text-amber-300/80">
                  NotebookLM can't reach <code className="text-amber-300 bg-amber-500/20 rounded px-1">localhost</code> URLs from its servers.
                  Expose your app publicly with one of these:
                </p>
                <div className="space-y-1.5">
                  <div className="rounded-md bg-black/30 px-3 py-2">
                    <p className="text-[10px] text-amber-400/70 mb-1 font-medium">Option A — Cloudflare Tunnel (free, no account)</p>
                    <code className="text-[11px] text-amber-200 font-mono select-all">npx cloudflared tunnel --url http://localhost:3000</code>
                  </div>
                  <div className="rounded-md bg-black/30 px-3 py-2">
                    <p className="text-[10px] text-amber-400/70 mb-1 font-medium">Option B — ngrok</p>
                    <code className="text-[11px] text-amber-200 font-mono select-all">ngrok http 3000</code>
                  </div>
                </div>
                <p className="text-[11px] text-amber-300/70">
                  Then set <code className="text-amber-300 bg-amber-500/20 rounded px-1">NEXT_PUBLIC_APP_URL=https://your-tunnel-url.trycloudflare.com</code> in <code className="text-amber-300 bg-amber-500/20 rounded px-1">.env.local</code> and restart the server.
                </p>
              </div>
            )}

            {/* instructions */}
            <div className="px-5 pt-4 pb-2">
              <ol className="space-y-1.5 text-[12px] text-muted-foreground">
                <li className="flex gap-2 items-start">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">✓</span>
                  <span><strong className="text-foreground">URLs already copied!</strong> Open NotebookLM and create or open a notebook</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">2</span>
                  <span>Click <strong className="text-foreground">+ Add source</strong> → <strong className="text-foreground">Website</strong></span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">3</span>
                  <span><strong className="text-foreground">Paste</strong> — NotebookLM accepts multiple URLs at once (one per line)</span>
                </li>
              </ol>
            </div>

            {/* URL list */}
            <div className="px-5 pb-3 space-y-1.5 max-h-52 overflow-y-auto">
              {urls.map((item, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  <span className="flex-1 min-w-0 text-[11px] text-foreground truncate" title={item.name}>{item.name}</span>
                  <button
                    onClick={() => copySingle(item.url, i)}
                    className="shrink-0 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                    title="Copy this URL"
                  >
                    {copiedIndex === i
                      ? <Check className="h-3 w-3 text-green-400" />
                      : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              ))}
            </div>

            {/* footer actions */}
            <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
              <Button
                onClick={copyAll}
                variant="outline"
                size="sm"
                className="flex-1 gap-2 text-[12px]"
              >
                {copied
                  ? <><Check className="h-3.5 w-3.5 text-green-400" /> Copied!</>
                  : <><Copy className="h-3.5 w-3.5" /> Copy all URLs</>}
              </Button>
              <Button
                asChild
                size="sm"
                className="flex-1 gap-2 text-[12px] bg-blue-600 hover:bg-blue-500 text-white"
              >
                <a href="https://notebooklm.google.com/" target="_blank" rel="noreferrer">
                  <BookOpen className="h-3.5 w-3.5" />
                  Open NotebookLM
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </Button>
            </div>

            {/* note */}
            <p className="px-5 pb-3 text-[10px] text-muted-foreground/60">
              🔒 Secure temporary links — valid for 1 hour. No login required for NotebookLM to fetch these PDFs.
            </p>
          </>
        )}
      </div>
    </div>
  );
}


/* ─── selection action bar ────────────────────────────────────────── */
function SelectionBar({
  totalCount,
  selectedCount,
  onDownload,
  onSelectAll,
  onClear,
  onExportNotebookLM,
  isDownloading,
  selectedPdfCount,
}: {
  totalCount: number;
  selectedCount: number;
  onDownload: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onExportNotebookLM: () => void;
  isDownloading: boolean;
  selectedPdfCount: number;
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
      {selectedPdfCount > 0 && (
        <button
          onClick={onExportNotebookLM}
          title={`Export ${selectedPdfCount} PDF${selectedPdfCount !== 1 ? 's' : ''} to NotebookLM`}
          className="flex items-center gap-1 text-[11px] font-medium bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 px-2 py-1 rounded transition-colors"
        >
          <BookOpen className="h-3 w-3" />
          NLM{selectedPdfCount > 1 ? ` (${selectedPdfCount})` : ''}
        </button>
      )}
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
function MediaPreview({ file, onClose }: { file: SelectedFile; courseId: string; onClose: () => void }) {
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

/* ─── tag menu (folder tag management) ───────────────────────────── */
function TagMenu({ courseId, folderId }: { courseId: string; folderId: string }) {
  const { getFolderTag, setFolderTag, getTagDefs, upsertTagDef, renameTag, deleteTag, createTag } = useProgressStore();
  const appliedTag = getFolderTag(courseId, folderId);
  const tagDefs = getTagDefs(courseId);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_PALETTE[0]);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const reset = () => { setCreating(false); setEditingTag(null); setNewName(''); };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createTag(courseId, name, newColor);
    await setFolderTag(courseId, folderId, name);
    reset();
    setOpen(false);
  };

  const handleRename = async (oldTag: string) => {
    const name = editingName.trim();
    if (!name || name === oldTag) { setEditingTag(null); return; }
    await renameTag(courseId, oldTag, name);
    setEditingTag(null);
  };

  const tagEntries = Object.entries(tagDefs);

  return (
    <DropdownMenu open={open} onOpenChange={(o) => {
      if (!o && (creating || editingTag)) return;
      setOpen(o);
      if (!o) reset();
    }}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
          className="h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Tag className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 p-1"
        onCloseAutoFocus={e => e.preventDefault()}
        onClick={e => e.stopPropagation()}
      >
        {tagEntries.length > 0 && (
          <>
            {tagEntries.map(([name, color]) => (
              <div key={name} className="group/tag flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/60 cursor-pointer">
                {editingTag === name ? (
                  <div className="flex items-center gap-1 flex-1" onPointerDown={e => e.stopPropagation()}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleRename(name); }
                        if (e.key === 'Escape') setEditingTag(null);
                        e.stopPropagation();
                      }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-transparent border-b border-primary text-xs outline-none"
                      autoFocus
                    />
                    <button
                      onClick={e => { e.stopPropagation(); handleRename(name); }}
                      className="text-primary text-[10px] shrink-0"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="flex-1 flex items-center gap-1.5 text-xs text-left min-w-0"
                      onClick={async () => {
                        await setFolderTag(courseId, folderId, appliedTag === name ? null : name);
                        setOpen(false);
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="truncate flex-1">{name}</span>
                      {appliedTag === name && <Check className="h-3 w-3 shrink-0 text-primary" />}
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/tag:opacity-100">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingTag(name);
                          setEditingName(name);
                        }}
                        className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                        title="Rename"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          // update color via color picker inline
                          const nextIdx = (TAG_PALETTE.indexOf(color) + 1) % TAG_PALETTE.length;
                          upsertTagDef(courseId, name, TAG_PALETTE[nextIdx]);
                        }}
                        className="h-4 w-4 flex items-center justify-center rounded"
                        title="Change color"
                      >
                        <span className="w-2.5 h-2.5 rounded-full border border-background/40" style={{ backgroundColor: color }} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteTag(courseId, name); }}
                        className="h-4 w-4 flex items-center justify-center rounded text-destructive/60 hover:text-destructive"
                        title="Delete tag"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {creating ? (
          <div className="px-2 py-1.5 space-y-1.5" onPointerDown={e => e.stopPropagation()}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
                if (e.key === 'Escape') { e.preventDefault(); reset(); }
                e.stopPropagation();
              }}
              onClick={e => e.stopPropagation()}
              placeholder="Tag name…"
              className="w-full bg-muted/60 rounded px-2 py-1 text-xs outline-none border border-border focus:border-primary"
              autoFocus
            />
            <div className="flex gap-1 flex-wrap">
              {TAG_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={e => { e.stopPropagation(); setNewColor(c); }}
                  className="w-4 h-4 rounded-full transition-all"
                  style={{
                    backgroundColor: c,
                    outline: newColor === c ? `2px solid ${c}` : undefined,
                    outlineOffset: newColor === c ? '2px' : undefined,
                  }}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={e => { e.stopPropagation(); handleCreate(); }}
                className="flex-1 text-[11px] bg-primary text-primary-foreground rounded px-2 py-0.5"
              >
                Create
              </button>
              <button
                onClick={e => { e.stopPropagation(); reset(); }}
                className="text-[11px] text-muted-foreground px-2 py-0.5 rounded hover:bg-muted/60"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/60 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
            onClick={e => {
              e.stopPropagation();
              setNewColor(TAG_PALETTE[tagEntries.length % TAG_PALETTE.length]);
              setCreating(true);
            }}
          >
            <Plus className="h-3 w-3" />
            New tag…
          </div>
        )}

        {appliedTag && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { setFolderTag(courseId, folderId, null); setOpen(false); }}
              className="text-muted-foreground text-xs"
            >
              <X className="h-3.5 w-3.5 mr-2" /> Remove tag
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── tree node (teaching material) ──────────────────────────────── */
function TreeNode({
  courseId,
  item, depth, expandedFolders, onToggleFolder, selectedFileId, onSelectFile,
  selection, anySelected, onToggleSelect,
  folderSelectionState,
  folderFileCounts,
}: {
  courseId: string;
  item: ApiItem; depth: number; expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void; selectedFileId: string | null;
  onSelectFile: (item: ApiItem, e: React.MouseEvent) => void;
  selection: Set<string>; anySelected: boolean;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  folderSelectionState: Map<string, { checked: boolean; indeterminate: boolean }>;
  folderFileCounts: Map<string, number>;
}) {
  const indent = depth * 12;
  const { toggleFileComplete, isFileComplete, getFolderTag, getTagColor } = useProgressStore();

  if (item.type === 'directory') {
    const isExpanded = expandedFolders.has(item.id);
    const folderState = folderSelectionState.get(item.id) ?? { checked: false, indeterminate: false };
    const children = item.files ?? [];
    const tag = getFolderTag(courseId, item.id);
    const tagColor = tag ? getTagColor(courseId, tag) : null;
    return (
      <div>
        <div style={{ paddingLeft: `${8 + indent}px` }} className="group flex items-center gap-1.5 pr-1 py-1.5 rounded-md text-sm hover:bg-muted/60 transition-colors">
          <RowCheckbox
            checked={folderState.checked}
            indeterminate={folderState.indeterminate}
            anySelected={anySelected}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id, e.shiftKey); }}
          />
          <button onClick={() => onToggleFolder(item.id)} className="flex-1 flex items-center gap-1.5 text-left min-w-0">
            <span className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </span>
            {isExpanded ? <FolderOpen className="h-4 w-4 shrink-0 text-primary" /> : <Folder className="h-4 w-4 shrink-0 text-primary fill-primary/20" />}
            <span className="truncate flex-1 font-medium min-w-0">{item.name}</span>
            {tagColor && tag ? (
              <span
                className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${tagColor}26`, color: tagColor }}
              >
                {tag}
              </span>
            ) : (
              children.length > 0 && <span className="text-[10px] text-muted-foreground/40 shrink-0">{children.length}</span>
            )}
          </button>
          <TagMenu courseId={courseId} folderId={item.id} />
        </div>
        {isExpanded && (
          <div>
            {children.length === 0
              ? <div style={{ paddingLeft: `${20 + indent}px` }} className="py-1.5 pr-2"><span className="text-xs text-muted-foreground/40 italic">Empty</span></div>
              : children.map(child => (
                <TreeNode key={child.id} courseId={courseId} item={child} depth={depth + 1}
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
  const isDone = isFileComplete(courseId, item.id);
  return (
    <div
      style={{ paddingLeft: `${8 + indent}px` }}
      className={`group flex items-center gap-2 pr-1.5 py-1.5 rounded-md text-sm transition-colors ${isChecked ? 'bg-primary/10 text-foreground' : isSelected ? 'bg-muted/80 text-foreground' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'}`}
    >
      <RowCheckbox
        checked={isChecked}
        anySelected={anySelected}
        onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id, e.shiftKey); }}
      />
      <button onClick={(e) => onSelectFile(item, e)} className="flex-1 flex items-center gap-2 min-w-0 text-left">
        <FileIcon mimeType={item.mimeType} name={item.name} />
        <span className={`truncate flex-1 min-w-0 ${isDone ? 'line-through opacity-50' : ''}`}>{item.name}</span>
        {item.sizeInKiloBytes ? <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0">{formatBytes(item.sizeInKiloBytes)}</span> : null}
      </button>
      <button
        onClick={e => { e.stopPropagation(); toggleFileComplete(courseId, item.id); }}
        title={isDone ? 'Mark incomplete' : 'Mark complete'}
        className={`shrink-0 transition-all ${isDone ? 'opacity-100 text-green-500' : 'opacity-0 group-hover:opacity-60 text-muted-foreground hover:!opacity-100 hover:text-green-500'}`}
      >
        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </button>
    </div>
  );
}
const TAB_LABELS: Record<MaterialsActiveTab, string> = {
  teaching: 'Materials',
  dropbox: 'Dropbox',
  virtual: 'Recordings',
  uploads: 'My Files',
};

function SidebarHeader({
  activeTab,
  onTabChange,
  onCollapse,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onUpload,
}: {
  activeTab: MaterialsActiveTab;
  onTabChange: (tab: MaterialsActiveTab) => void;
  onCollapse: () => void;
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onUpload?: () => void;
}) {
  const activeTabIcon = activeTab === 'teaching'
    ? <FolderOpen className="h-3.5 w-3.5 text-primary" />
    : activeTab === 'dropbox'
      ? <Package className="h-3.5 w-3.5 text-blue-500" />
      : activeTab === 'uploads'
        ? <HardDrive className="h-3.5 w-3.5 text-emerald-500" />
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
            {(['teaching', 'dropbox', 'virtual', 'uploads'] as MaterialsActiveTab[]).map((tab) => (
              <option key={tab} value={tab}>{TAB_LABELS[tab]}</option>
            ))}
          </select>
        </div>

        {activeTab === 'uploads' ? (
          <button
            onClick={onUpload}
            title="Upload files"
            className="flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
        ) : (
          <>
            <div className="flex min-w-[68px] h-8 items-center rounded-md border border-border overflow-hidden">
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
          </>
        )}

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
  onTabChange,
  initialViewMode = 'list',
  onViewModeChange,
  initialSidebarCollapsed = false,
  onSidebarChange,
  initialExpandedFolders = [],
  onExpandedFoldersChange,
  initialGridFolderStack = [],
  onGridFolderStackChange,
  initialPreviewId = null,
  onPreviewIdChange,
  onTagProgressChange,
}: {
  courseId: string;
  year?: string;
  initialTab?: MaterialsActiveTab;
  onTabChange?: (tab: string) => void;
  initialViewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  initialSidebarCollapsed?: boolean;
  onSidebarChange?: (collapsed: boolean) => void;
  initialExpandedFolders?: string[];
  onExpandedFoldersChange?: (folders: string[]) => void;
  initialGridFolderStack?: string[];
  onGridFolderStackChange?: (stack: string[]) => void;
  initialPreviewId?: string | null;
  onPreviewIdChange?: (preview: { id: string; name: string; url: string } | null) => void;
  onTagProgressChange?: (progress: TagProgressSummary | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<MaterialsActiveTab>(initialTab);

  const switchTab = useCallback((tab: MaterialsActiveTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  
  const [viewModeInternal, setViewModeInternal] = useState<ViewMode>(initialViewMode);
  const viewMode = viewModeInternal;
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeInternal(mode);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);
  
  const numericId = parseInt(courseId, 10);

  // Data for all tabs — let react-query cache them
  const { data: rootItems = [], isLoading: filesLoading, isFetching: filesFetching } = useGetCourseFiles(numericId, year);
  const { data: assignments = [], isLoading: assignLoading } = useGetCourseAssignments(numericId);
  const { data: virtualClassrooms = [], isLoading: vcLoading } = useGetCourseVirtualClassrooms(numericId);
  const { data: videolectures = [], isLoading: vlLoading } = useGetCourseVideolectures(numericId);

  // Teaching material state
  const [expandedFoldersInternal, setExpandedFoldersInternal] = useState<Set<string>>(new Set(initialExpandedFolders));
  const expandedFolders = expandedFoldersInternal;
  const expandedFoldersRef = useRef(expandedFoldersInternal);
  expandedFoldersRef.current = expandedFoldersInternal;
  const setExpandedFolders = useCallback((val: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    const next = typeof val === 'function' ? val(expandedFoldersRef.current) : val;
    setExpandedFoldersInternal(next);
    onExpandedFoldersChange?.(Array.from(next));
  }, [onExpandedFoldersChange]);

  const [selectedFileInternal, setSelectedFileInternal] = useState<SelectedFile | null>(null);
  const selectedFile = selectedFileInternal;
  const setSelectedFile = useCallback((file: SelectedFile | null) => {
    setSelectedFileInternal(file);
    onPreviewIdChange?.(file ? { id: file.id, name: file.name, url: file.url } : null);
  }, [onPreviewIdChange]);

  // ── Batch selection ──────────────────────────────────────────────
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const lastSelectedIdRef = useRef<string | null>(null);
  const [notebookLMState, setNotebookLMState] = useState<{
    loading: boolean;
    files: { name: string; url: string }[];
    isLocalhost?: boolean;
    error?: string;
  } | null>(null);
  
  const [gridFolderStackInternal, setGridFolderStackInternal] = useState<string[]>(initialGridFolderStack);
  const gridFolderStack = gridFolderStackInternal;
  const gridFolderStackRef = useRef(gridFolderStackInternal);
  gridFolderStackRef.current = gridFolderStackInternal;
  const setGridFolderStack = useCallback((val: string[] | ((prev: string[]) => string[])) => {
    const next = typeof val === 'function' ? val(gridFolderStackRef.current) : val;
    setGridFolderStackInternal(next);
    onGridFolderStackChange?.(next);
  }, [onGridFolderStackChange]);
  
  const breadcrumbScrollRef = useRef<HTMLDivElement | null>(null);

  // Sidebar panel
  const [isSidebarCollapsedInternal, setIsSidebarCollapsedInternal] = useState(initialSidebarCollapsed);
  const isSidebarCollapsed = isSidebarCollapsedInternal;
  const isSidebarCollapsedRef = useRef(isSidebarCollapsedInternal);
  isSidebarCollapsedRef.current = isSidebarCollapsedInternal;
  const setIsSidebarCollapsed = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof val === 'function' ? val(isSidebarCollapsedRef.current) : val;
    setIsSidebarCollapsedInternal(next);
    if (isSidebarCollapsedRef.current !== next) onSidebarChange?.(next);
  }, [onSidebarChange]);
  const sidebarRef = usePanelRef();
  const sidebarOnResize = useSnapOnRelease(sidebarRef, SIDEBAR_SNAPS, () => setIsSidebarCollapsed(true));

  // ── Uploads (My Files) tab ───────────────────────────────────────
  const { materials, folders: localFolders, fetchMaterials, fetchFolders, createMaterial, createFolder, deleteMaterial, deleteFolder } = useMaterialStore();

  // Load progress from IndexedDB for this course
  const { loadCourse, isFileComplete: isFileCompleteInStore, getFolderTag, getTagDefs, getTagColor } = useProgressStore();
  // Subscribe to cache slice so progress re-renders when completion toggles
  const progressCacheForCourse = useProgressStore(s => s._cache[courseId]);
  useEffect(() => { loadCourse(courseId); }, [courseId, loadCourse]);

  const [selectedLocalMaterial, setSelectedLocalMaterial] = useState<Material | null>(null);
  const [localFolderId, setLocalFolderId] = useState<string | null>(null);
  const [localSelection, setLocalSelection] = useState<Set<string>>(new Set());
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const downloadMaterial = (material: Material) => {
    if (material.type === 'pdf' && material.fileData) {
      const url = URL.createObjectURL(new Blob([material.fileData], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = material.fileName ?? material.name; a.click();
      URL.revokeObjectURL(url);
    } else if (material.type === 'note' && material.content !== undefined) {
      const url = URL.createObjectURL(new Blob([material.content], { type: 'text/markdown' }));
      const a = document.createElement('a'); a.href = url; a.download = material.name; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadLocalSelection = () => {
    materials.filter(m => localSelection.has(m.id)).forEach(downloadMaterial);
  };

  const toggleLocalSelect = (id: string) => {
    setLocalSelection(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  useEffect(() => {
    if (activeTab === 'uploads') {
      fetchMaterials(courseId);
      fetchFolders(courseId);
    }
  }, [activeTab, courseId, fetchMaterials, fetchFolders]);

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Find or create target folder
    let folderId = localFolderId;
    if (!folderId) {
      let uploadsFolder = localFolders.find(f => f.courseId === courseId && f.name === 'Uploads' && f.parentId === null);
      if (!uploadsFolder) {
        uploadsFolder = await createFolder({ courseId, name: 'Uploads', parentId: null });
      }
      folderId = uploadsFolder.id;
      setLocalFolderId(folderId);
    }
    for (const file of Array.from(files)) {
      const arrayBuffer = await file.arrayBuffer();
      const isNote = file.name.endsWith('.md') || file.name.endsWith('.txt');
      if (isNote) {
        const text = new TextDecoder().decode(arrayBuffer);
        await createMaterial({ courseId, folderId, type: 'note', name: file.name, content: text, fileSize: file.size });
      } else {
        await createMaterial({ courseId, folderId, type: 'pdf', name: file.name, fileName: file.name, fileData: arrayBuffer, fileSize: file.size });
      }
    }
    await fetchMaterials(courseId);
    await fetchFolders(courseId);
  };

  const localCurrentFolders = localFolders.filter(f => f.courseId === courseId && f.parentId === localFolderId);
  const localCurrentMaterials = materials.filter(m => m.courseId === courseId && m.folderId === localFolderId);

  const getLocalFolderPath = (folderId: string | null): FolderType[] => {
    if (!folderId) return [];
    const path: FolderType[] = [];
    let current = localFolders.find(f => f.id === folderId);
    while (current) {
      path.unshift(current);
      current = current.parentId ? localFolders.find(f => f.id === current!.parentId) : undefined;
    }
    return path;
  };

  const localFolderPath = getLocalFolderPath(localFolderId);

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

  const initialPreviewResolved = useRef(false);
  useEffect(() => {
    if (initialPreviewId && !initialPreviewResolved.current && activeSelectableById.has(initialPreviewId)) {
      const item = activeSelectableById.get(initialPreviewId);
      if (item && item.type === 'file' && item.url) {
        setSelectedFileInternal({
          id: item.id,
          name: item.name,
          mimeType: item.mimeType,
          url: item.url,
          externalUrl: activeTab === 'virtual' ? item.url : undefined,
        });
      }
      initialPreviewResolved.current = true;
    } else if (!initialPreviewId) {
      initialPreviewResolved.current = true;
    }
  }, [initialPreviewId, activeSelectableById, activeTab]);

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

  // ── export to NotebookLM ──────────────────────────────────────────
  const exportToNotebookLM = useCallback(async () => {
    const internalFiles: { internalUrl: string; name: string }[] = [];

    if (activeTab === 'teaching') {
      const uniqueFiles = new Map<string, SelectableItem>();
      teachingSelectableAll.forEach((item) => {
        if (item.type !== 'file' || !item.available || !item.url) return;
        const selectedDirectly = selection.has(item.id);
        const selectedByFolder = (item.ancestorFolderIds ?? []).some((folderId) => selection.has(folderId));
        if (selectedDirectly || selectedByFolder) uniqueFiles.set(item.id, item);
      });
      uniqueFiles.forEach((item) => {
        if (getFileKind(item.mimeType, item.name) === 'pdf' && item.url) {
          internalFiles.push({ internalUrl: item.url, name: item.name });
        }
      });
    } else {
      activeSelectableItems.forEach((item) => {
        if (item.type !== 'file' || !selection.has(item.id) || !item.available || !item.url) return;
        if (getFileKind(item.mimeType, item.name) === 'pdf') {
          internalFiles.push({ internalUrl: item.url, name: item.name });
        }
      });
    }

    if (!internalFiles.length) return;

    // Show loading state immediately
    setNotebookLMState({ loading: true, files: [] });

    try {
      const res = await fetch('/api/materials/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: internalFiles }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json() as { files: { name: string; publicUrl: string }[]; isLocalhost?: boolean };
      const files = data.files.map((f) => ({ name: f.name, url: f.publicUrl }));
      setNotebookLMState({ loading: false, files, isLocalhost: data.isLocalhost });
    } catch (e) {
      setNotebookLMState({ loading: false, files: [], error: (e as Error).message });
    }
  }, [activeSelectableItems, activeTab, selection, teachingSelectableAll]);

  // ── selected PDF count (for NLM button badge) ──────────────────────
  const selectedPdfCount = useMemo(() => {
    if (activeTab === 'teaching') {
      const uniqueFiles = new Set<string>();
      teachingSelectableAll.forEach((item) => {
        if (item.type !== 'file' || !item.available || !item.url) return;
        const selectedDirectly = selection.has(item.id);
        const selectedByFolder = (item.ancestorFolderIds ?? []).some((folderId) => selection.has(folderId));
        if ((selectedDirectly || selectedByFolder) && getFileKind(item.mimeType, item.name) === 'pdf') {
          uniqueFiles.add(item.id);
        }
      });
      return uniqueFiles.size;
    }
    return activeSelectableItems.filter(
      (item) => item.type === 'file' && selection.has(item.id) && getFileKind(item.mimeType, item.name) === 'pdf'
    ).length;
  }, [activeSelectableItems, activeTab, selection, teachingSelectableAll]);

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
  const handleTabChange = (tab: MaterialsActiveTab) => {
    switchTab(tab);
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
    (activeTab === 'virtual' && (vcLoading || vlLoading)) ||
    (activeTab === 'uploads' && false);

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

  const tagProgress = useMemo(() => {
    if (!progressCacheForCourse) return null;
    const { folderTags, completedFileIds, tagDefs: rawTagDefs } = progressCacheForCourse;
    const tagDefs: Record<string, string> = { ...rawTagDefs };
    for (const tag of Object.values(folderTags)) {
      if (!tagDefs[tag]) tagDefs[tag] = BUILTIN_COLORS[tag] ?? '#6b7280';
    }
    const perTagFiles: Record<string, Set<string>> = {};
    for (const node of allTeachingNodes) {
      if (node.type !== 'directory') continue;
      const tag = folderTags[node.id];
      if (!tag) continue;
      const fileIds = descendantFileIdsByFolder.get(node.id) ?? [];
      if (!perTagFiles[tag]) perTagFiles[tag] = new Set();
      fileIds.forEach(id => perTagFiles[tag].add(id));
    }
    const allTaggedIds = new Set([...Object.values(perTagFiles)].flatMap(s => [...s]));
    const totalTagged = allTaggedIds.size;
    const completedTagged = [...allTaggedIds].filter(id => completedFileIds.includes(id)).length;
    const totalPct = totalTagged > 0 ? Math.round((completedTagged / totalTagged) * 100) : 0;
    const perTag = Object.entries(perTagFiles).map(([tagName, fileIds]) => {
      const color = tagDefs[tagName] ?? '#6b7280';
      const total = fileIds.size;
      const completed = [...fileIds].filter(id => completedFileIds.includes(id)).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { tagName, color, total, completed, pct };
    });
    return { totalTagged, completedTagged, totalPct, perTag };
  }, [progressCacheForCourse, allTeachingNodes, descendantFileIdsByFolder]);

  useEffect(() => { onTagProgressChange?.(tagProgress); }, [tagProgress, onTagProgressChange]);

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
      const progressBar = null; // rendered above scroll area now

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
      ) : viewMode === 'list' ? <>{progressBar}{sortedRootItems.map((item) => (
        <TreeNode
          key={item.id}
          courseId={courseId}
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
      ))}</> : (
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

    if (activeTab === 'uploads') {
      const isEmpty = localCurrentFolders.length === 0 && localCurrentMaterials.length === 0;
      return (
        <div className="flex flex-col h-full">
          {/* breadcrumb */}
          {localFolderPath.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border text-xs overflow-x-auto shrink-0">
              <button onClick={() => setLocalFolderId(null)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">Root</button>
              {localFolderPath.map(f => (
                <span key={f.id} className="flex items-center gap-1 shrink-0">
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                  <button onClick={() => setLocalFolderId(f.id)} className="text-muted-foreground hover:text-foreground transition-colors">{f.name}</button>
                </span>
              ))}
            </div>
          )}
          {isEmpty ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <HardDrive className="h-10 w-10 text-muted-foreground/20" />
              <p className="font-medium text-foreground">No files yet</p>
              <p className="text-xs text-muted-foreground">Upload PDFs, markdown notes, or save converted documents here</p>
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="mt-1 flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <Upload className="h-4 w-4" /> Upload files
              </button>
            </div>
          ) : (
            <div className="flex-1 relative overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto pb-10">
              <div className="p-1.5 space-y-0.5">
                {localCurrentFolders.map(folder => {
                  const count = materials.filter(m => m.folderId === folder.id).length;
                  return (
                    <div key={folder.id} className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors">
                      <span className="w-4 shrink-0" />
                      <button className="flex-1 flex items-center gap-2 min-w-0 text-left" onClick={() => setLocalFolderId(folder.id)}>
                        <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                        <span className="text-sm font-medium truncate">{folder.name}</span>
                        {count > 0 && <span className="text-[10px] text-muted-foreground/50 ml-auto">{count}</span>}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-colors">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Delete this folder and all its contents?')) deleteFolder(folder.id); }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
                {localCurrentMaterials.map(material => {
                  const isPreview = selectedLocalMaterial?.id === material.id;
                  const isChecked = localSelection.has(material.id);
                  const anyChecked = localSelection.size > 0;
                  return (
                    <div key={material.id}
                      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${isChecked ? 'bg-primary/10 text-foreground' : isPreview ? 'bg-muted/80 text-foreground' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'}`}
                      onClick={() => { setSelectedLocalMaterial(material); setSelectedFile(null); }}
                    >
                      <span
                        onClick={e => { e.stopPropagation(); toggleLocalSelect(material.id); }}
                        className={`shrink-0 w-4 h-4 flex items-center justify-center rounded cursor-pointer transition-all ${anyChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isChecked ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                      >
                        {isChecked ? <CheckSquare2 className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </span>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        {material.type === 'pdf'
                          ? <FileText className="h-4 w-4 shrink-0 text-red-500" />
                          : <FileText className="h-4 w-4 shrink-0 text-blue-500" />}
                        <span className="text-sm truncate">{material.name}</span>
                        {material.fileSize && <span className="text-[10px] text-muted-foreground/40 ml-auto shrink-0">{formatBytes(material.fileSize / 1024)}</span>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-colors" onClick={e => e.stopPropagation()}>
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); downloadMaterial(material); }}>
                            <Download className="h-4 w-4 mr-2" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); deleteMaterial(material.id); if (selectedLocalMaterial?.id === material.id) setSelectedLocalMaterial(null); }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* selection bar */}
            <div className={`absolute bottom-0 inset-x-0 z-20 border-t border-border bg-card/95 backdrop-blur-sm px-2 py-1.5 flex items-center gap-1 transition-all duration-200 ${localSelection.size > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}>
              <span className="text-xs font-semibold text-foreground flex-1 pl-1">{localSelection.size} selected</span>
              <button onClick={downloadLocalSelection} className="flex items-center gap-1 text-[11px] font-medium bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded transition-colors">
                <Download className="h-3 w-3" /> Download
              </button>
              <button onClick={() => setLocalSelection(new Set())} className="text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-muted/60 transition-colors">Clear</button>
            </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // ── preview content ──────────────────────────────────────────────
  const renderPreview = () => {
    if (activeTab === 'uploads' && selectedLocalMaterial) {
      if (selectedLocalMaterial.type === 'pdf' && selectedLocalMaterial.fileData) {
        return <PDFViewer material={selectedLocalMaterial} courseId={courseId} onClose={() => setSelectedLocalMaterial(null)} />;
      }
      if (selectedLocalMaterial.type === 'note' && selectedLocalMaterial.content !== undefined) {
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
              <h2 className="text-sm font-semibold truncate flex-1 min-w-0">{selectedLocalMaterial.name}</h2>
              <button onClick={() => setSelectedLocalMaterial(null)} className="ml-4 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]}>
                {(selectedLocalMaterial.content ?? '').replace(/\bstroke="black"\b/g, 'stroke="currentColor"').replace(/\bfill="black"\b/g, 'fill="currentColor"')}
              </ReactMarkdown>
            </div>
          </div>
        );
      }
    }

    if (!selectedFile) {
      const icons: Record<MaterialsActiveTab, JSX.Element> = {
        teaching: <FileText className="h-12 w-12 text-muted-foreground/20" />,
        dropbox: <Package className="h-12 w-12 text-muted-foreground/20" />,
        virtual: <Monitor className="h-12 w-12 text-muted-foreground/20" />,
        uploads: <HardDrive className="h-12 w-12 text-muted-foreground/20" />,
      };
      const hints: Record<MaterialsActiveTab, string> = {
        teaching: 'Expand a folder and click any file',
        dropbox: 'Dropbox is shown only when API returns Dropbox-specific files',
        virtual: 'Choose a recording from the list to play it',
        uploads: 'Select a file from My Files to preview it',
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

  return (<>
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
          onTabChange={switchTab}
          onCollapse={() => sidebarRef.current?.collapse()}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onUpload={() => uploadInputRef.current?.click()}
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
            onExportNotebookLM={exportToNotebookLM}
            isDownloading={isDownloading}
            selectedPdfCount={selectedPdfCount}
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
            {(['teaching', 'dropbox', 'virtual', 'uploads'] as MaterialsActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { handleTabChange(tab); sidebarRef.current?.expand(); setIsSidebarCollapsed(false); }}
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
    {/* ── NotebookLM export modal ───────────────────────────────── */}
    {notebookLMState && (
      <NotebookLMModal
        loading={notebookLMState.loading}
        urls={notebookLMState.files}
        error={notebookLMState.error}
        isLocalhost={notebookLMState.isLocalhost}
        onClose={() => setNotebookLMState(null)}
      />
    )}
    {/* hidden file input for My Files uploads */}
    <input
      ref={uploadInputRef}
      type="file"
      multiple
      accept=".pdf,.md,.txt"
      className="hidden"
      onChange={e => { handleUploadFiles(e.target.files); e.target.value = ''; }}
    />
  </>);
}
