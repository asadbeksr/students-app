'use client';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import MaterialsTab from '@/components/materials/MaterialsTab';
import { useGetCourse, useGetCourseGuide, useGetCourseNotices, useGetCourses } from '@/lib/queries/courseHooks';
import { useGetNotifications, useMarkNotificationAsRead } from '@/lib/queries/studentHooks';
import { getApiClient } from '@/lib/api/client';
import { useToolkitStore } from '@/lib/stores/toolkitStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueries } from '@tanstack/react-query';
import { Bell, X, ChevronDown, BookOpen, Clock3, ArrowUpDown, ExternalLink, Building2, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import ChatWindow from '@/components/chat/ChatWindow';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePanelRef } from 'react-resizable-panels';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const CHAT_SNAPS = [33, 50];
const SNAP_THRESHOLD = 6;

function useSnapOnRelease(panelRef: ReturnType<typeof usePanelRef>, snaps: number[]) {
  const sizeRef = useRef(0);
  const onResize = (size: { asPercentage: number }) => { sizeRef.current = size.asPercentage ?? 0; };
  useEffect(() => {
    const snap = () => {
      const pct = sizeRef.current;
      if (!pct) return;
      const nearest = snaps.reduce((a, b) => Math.abs(b - pct) < Math.abs(a - pct) ? b : a);
      if (Math.abs(nearest - pct) > SNAP_THRESHOLD || Math.abs(nearest - pct) < 0.5) return;
      panelRef.current?.resize(`${nearest}%`);
    };
    document.addEventListener('pointerup', snap);
    return () => document.removeEventListener('pointerup', snap);
  }, [panelRef, snaps]);
  return onResize;
}

/* ── Academic year selector ─────────────────────────────────────── */
type AcademicYearOption = {
  value: string;
  label: string;
  courseId: number;
  apiYear?: string;
};

type CourseSwitchOption = {
  value: string;
  label: string;
  courseId: number;
};

type StaffPerson = {
  staffIdRaw: string;
  staffIdNumber?: number;
  displayName: string;
  role?: string;
  email?: string;
  picture?: string;
  department?: string;
  phone?: string;
  profileHref?: string;
};

type StaffBaseEntry = {
  idRaw: string;
  numericId?: number;
  role?: string;
  name?: string;
  email?: string;
};

type GuideSectionItem = {
  title: string;
  content: string;
};

type UsefulLinkItem = {
  label: string;
  url: string;
};

function formatAcademicYearLabel(year: number): string {
  return `${year - 1}/${String(year).slice(-2)}`;
}

function toPolitoPersonParam(personId: unknown): string | undefined {
  if (personId == null) return undefined;
  const raw = String(personId).trim();
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) return raw.padStart(6, '0');
  return raw;
}

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function formatTeachingPeriod(period: unknown): string | undefined {
  if (period == null) return undefined;
  const raw = String(period).trim();
  if (!raw) return undefined;

  const compact = raw.replace(/\s+/g, '');
  const doubleSegment = compact.match(/^(\d+)[-/.](\d+)$/);
  if (doubleSegment) {
    const semester = Number(doubleSegment[1]);
    const block = Number(doubleSegment[2]);
    if (Number.isFinite(semester) && Number.isFinite(block)) {
      return `${ordinal(semester)} semester, ${ordinal(block)} slot`;
    }
  }

  const single = compact.match(/^\d+$/);
  if (single) {
    const semester = Number(compact);
    if (Number.isFinite(semester)) return `${ordinal(semester)} semester`;
  }

  return raw;
}

function getPeriodBadgeValue(period: unknown): string | undefined {
  if (period == null) return undefined;
  const raw = String(period).trim();
  if (!raw) return undefined;

  const compact = raw.replace(/\s+/g, '');
  const firstSegment = compact.match(/^(\d+)[-/.]/);
  if (firstSegment?.[1]) return firstSegment[1];
  if (/^\d+$/.test(compact)) return compact;

  return undefined;
}

function toValidDate(input: unknown): Date | undefined {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? undefined : input;
  }

  if (typeof input === 'number') {
    const fromNumber = new Date(input < 1_000_000_000_000 ? input * 1000 : input);
    return Number.isNaN(fromNumber.getTime()) ? undefined : fromNumber;
  }

  if (typeof input === 'string') {
    const raw = input.trim();
    if (!raw) return undefined;

    const numeric = Number(raw);
    if (Number.isFinite(numeric) && /^\d{10,13}$/.test(raw)) {
      const fromNumericString = new Date(raw.length === 10 ? numeric * 1000 : numeric);
      return Number.isNaN(fromNumericString.getTime()) ? undefined : fromNumericString;
    }

    const fromString = new Date(raw);
    return Number.isNaN(fromString.getTime()) ? undefined : fromString;
  }

  return undefined;
}

function extractNoticeDate(notice: any): Date | undefined {
  const dateCandidates = [
    notice?.publishedAt,
    notice?.publishDate,
    notice?.createdAt,
    notice?.updatedAt,
    notice?.date,
    notice?.timestamp,
  ];

  for (const candidate of dateCandidates) {
    const value = toValidDate(candidate);
    if (value) return value;
  }

  return undefined;
}

function htmlToText(html: unknown): string {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatNoticeTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNoticeDayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function parseNotificationScope(scope: unknown): string[] {
  if (Array.isArray(scope)) return scope.map((entry) => String(entry));

  if (typeof scope === 'string') {
    const raw = scope.trim();
    if (!raw) return [];

    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map((entry) => String(entry));
      } catch {
        // Keep fallback parsing.
      }
    }

    return raw.split(/[./]/).filter(Boolean);
  }

  return [];
}

function parseNotificationPayload(payload: unknown): any {
  if (!payload) return undefined;
  if (typeof payload === 'object') return payload;
  if (typeof payload !== 'string') return undefined;

  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}

function extractNoticeNotificationTarget(notification: any): { noticeId?: string; courseId?: string } {
  const scope = parseNotificationScope(notification?.scope);
  const noticesIndex = scope.lastIndexOf('notices');
  const coursesIndex = scope.lastIndexOf('courses');

  if (noticesIndex >= 0) {
    return {
      noticeId: scope[noticesIndex + 1] ? String(scope[noticesIndex + 1]) : undefined,
      courseId: coursesIndex >= 0 && scope[coursesIndex + 1] ? String(scope[coursesIndex + 1]) : undefined,
    };
  }

  const payload = parseNotificationPayload(notification?.payload);
  const payloadNoticeId = payload?.idAvviso ?? notification?.noticeId ?? notification?.idAvviso;
  const payloadCourseId = payload?.inc ?? notification?.courseId;

  return {
    noticeId: payloadNoticeId != null ? String(payloadNoticeId) : undefined,
    courseId: payloadCourseId != null ? String(payloadCourseId) : undefined,
  };
}

function collectLinksFromText(text: unknown): string[] {
  if (typeof text !== 'string') return [];
  const regex = /https?:\/\/[^\s"'<>]+/gi;
  return text.match(regex) ?? [];
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function isLikelyMoodleUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('moodle');
}

function stripHtmlTags(text: string): string {
  return text
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function collectAnchoredLinksFromHtml(text: unknown): Array<{ url: string; label?: string }> {
  if (typeof text !== 'string' || !text.includes('<a')) return [];

  const out: Array<{ url: string; label?: string }> = [];
  const source = text
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  const anchorRegex = /<a\b[^>]*href=(?:["']([^"']+)["']|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null = null;

  while ((match = anchorRegex.exec(source)) !== null) {
    const url = (match[1] ?? match[2] ?? '').trim();
    if (!url || !isHttpUrl(url)) continue;
    const label = stripHtmlTags(match[3] ?? '');
    out.push({ url, label: label || undefined });
  }

  return out;
}

function collectMarkdownLinks(text: unknown): Array<{ url: string; label?: string }> {
  if (typeof text !== 'string') return [];
  const out: Array<{ url: string; label?: string }> = [];
  const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
  let match: RegExpExecArray | null = null;

  while ((match = markdownRegex.exec(text)) !== null) {
    const label = stripHtmlTags(match[1] ?? '');
    const url = (match[2] ?? '').trim();
    if (!isHttpUrl(url)) continue;
    out.push({ url, label: label || undefined });
  }

  return out;
}

function deriveLineLabelPairs(text: unknown): Array<{ url: string; label?: string }> {
  if (typeof text !== 'string') return [];

  const out: Array<{ url: string; label?: string }> = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => stripHtmlTags(line))
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const inlineMatch = line.match(/^(.{2,120}?)\s*[:\-]\s*(https?:\/\/\S+)$/i);
    if (inlineMatch) {
      const label = inlineMatch[1].trim();
      const url = inlineMatch[2].trim();
      if (isHttpUrl(url)) out.push({ url, label: isUsefulLabel(label) ? label : undefined });
      continue;
    }

    if (isHttpUrl(line)) {
      const prev = i > 0 ? lines[i - 1] : undefined;
      const label = prev && !isHttpUrl(prev) && isUsefulLabel(prev) ? prev : undefined;
      out.push({ url: line, label });
    }
  }

  return out;
}

function getUrlHost(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function initialsFromName(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || 'P';
}

function inferLinkLabel(url: string): string {
  const lower = url.toLowerCase();
  if (isLikelyMoodleUrl(url)) return 'Moodle';
  if (lower.includes('teams.microsoft') || lower.includes('teams.live')) return 'Microsoft Teams';
  if (lower.includes('zoom.us')) return 'Zoom';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube';
  if (lower.includes('polito.it')) return 'PoliTO';

  const host = getUrlHost(url);
  return host ? host.replace(/\.[a-z]{2,}$/, '') : 'External link';
}

function isUsefulLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  return true;
}

function getUsefulLinksFromCourseData(course: any, guide: any[]): UsefulLinkItem[] {
  const labeled = new Map<string, { label?: string; priority: number; index: number }>();
  let sequence = 0;

  const addLink = (urlValue: unknown, label?: string, priority = 0) => {
    if (typeof urlValue !== 'string') return;
    const url = urlValue.trim();
    if (!/^https?:\/\//i.test(url)) return;

    const cleanLabel = typeof label === 'string' && isUsefulLabel(label) ? label.trim() : undefined;
    const existing = labeled.get(url);

    if (!existing) {
      labeled.set(url, {
        label: cleanLabel,
        priority,
        index: sequence++,
      });
      return;
    }

    const shouldUpgrade =
      priority > existing.priority ||
      (!existing.label && !!cleanLabel);

    if (shouldUpgrade) {
      labeled.set(url, {
        label: cleanLabel ?? existing.label,
        priority,
        index: existing.index,
      });
    }
  };

  const guideSections = Array.isArray(guide)
    ? guide
    : Array.isArray((guide as any)?.sections)
      ? (guide as any).sections
      : [];

  guideSections.forEach((section: any) => {
    const sectionTitle = typeof section?.title === 'string' && isUsefulLabel(section.title)
      ? stripHtmlTags(section.title)
      : undefined;
    const sectionContent = typeof section?.content === 'string' ? section.content : undefined;
    if (!sectionContent) return;

    collectAnchoredLinksFromHtml(sectionContent)
      .forEach((link) => addLink(link.url, link.label ?? sectionTitle, link.label ? 5 : 4));
    collectMarkdownLinks(sectionContent)
      .forEach((link) => addLink(link.url, link.label ?? sectionTitle, link.label ? 5 : 4));
    deriveLineLabelPairs(sectionContent)
      .forEach((link) => addLink(link.url, link.label ?? sectionTitle, link.label ? 5 : 4));
  });

  const visit = (value: unknown, depth: number) => {
    if (depth > 3 || value == null) return;

    if (typeof value === 'string') {
      collectAnchoredLinksFromHtml(value).forEach((link) => addLink(link.url, link.label, link.label ? 2 : 0));
      collectMarkdownLinks(value).forEach((link) => addLink(link.url, link.label, link.label ? 2 : 0));
      deriveLineLabelPairs(value).forEach((link) => addLink(link.url, link.label, link.label ? 2 : 0));
      collectLinksFromText(value).forEach((url) => addLink(url, undefined, 0));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;

      const urlCandidate = [
        obj.url,
        obj.href,
        obj.link,
        obj.externalUrl,
        obj.website,
        obj.courseUrl,
        obj.moodleUrl,
        obj.elearningUrl,
        obj.platformUrl,
      ].find((entry) => isHttpUrl(entry));

      const labelCandidate = [obj.title, obj.label, obj.name, obj.text]
        .find((entry) => typeof entry === 'string' && isUsefulLabel(entry));
      const altLabelCandidate = [obj.description, obj.subtitle, obj.caption]
        .find((entry) => typeof entry === 'string' && isUsefulLabel(entry));
      const resolvedLabel = typeof labelCandidate === 'string'
        ? labelCandidate
        : typeof altLabelCandidate === 'string'
          ? altLabelCandidate
          : undefined;

      if (isHttpUrl(urlCandidate)) {
        addLink(urlCandidate, resolvedLabel, resolvedLabel ? 3 : 1);
      }

      Object.values(obj).forEach((item) => visit(item, depth + 1));
    }
  };

  visit(course, 0);
  visit(guide, 0);

  return Array.from(labeled.entries())
    .sort(([, a], [, b]) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.index - b.index;
    })
    .slice(0, 8)
    .map(([url, meta]) => ({
      url,
      label: meta.label ?? inferLinkLabel(url),
    }));
}

function normalizeGuideSections(guide: any[]): GuideSectionItem[] {
  const rawSections = Array.isArray(guide) ? guide : [];

  return rawSections
    .map((section: any, index: number) => {
      const title = typeof section?.title === 'string' && section.title.trim()
        ? section.title.trim()
        : `Section ${index + 1}`;

      const contentRaw = typeof section?.content === 'string' ? section.content : '';
      const content = contentRaw.replace(/[\f]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

      return { title, content };
    })
    .filter((section) => section.content.length > 0);
}

function toApiYear(academicYear: string): string | undefined {
  if (/^\d{4}$/.test(academicYear)) return academicYear;

  const period = academicYear.match(/^(\d{4})\/(\d{2}|\d{4})$/);
  if (!period) return undefined;

  const startYear = Number(period[1]);
  const trailing = period[2];

  if (trailing.length === 4) return trailing;

  const century = Math.floor(startYear / 100) * 100;
  const endYear = century + Number(trailing);
  return String(endYear < startYear ? endYear + 100 : endYear);
}

function buildCourseSwitchLabel(course: any, fallbackId: number): string {
  const code = typeof course?.shortcode === 'string' && course.shortcode.trim()
    ? course.shortcode.trim()
    : typeof course?.code === 'string' && course.code.trim()
      ? course.code.trim()
      : undefined;

  const name = typeof course?.name === 'string' && course.name.trim()
    ? course.name.trim()
    : typeof course?.title === 'string' && course.title.trim()
      ? course.title.trim()
      : `Course ${fallbackId}`;

  const credits = course?.cfu ?? course?.credits;
  const base = [code ? `${code} -` : undefined, name].filter(Boolean).join(' ');
  return credits ? `${base} (${credits} cfu)` : base;
}

function AcademicYearSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: AcademicYearOption[];
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-muted/50 border border-border/60 text-xs font-medium text-foreground rounded-full pl-3 pr-7 py-1.5 cursor-pointer hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 h-3 w-3 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function CourseTitleSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: CourseSwitchOption[];
}) {
  return (
    <div className="relative inline-flex w-fit items-center min-w-0 shrink max-w-[20rem] sm:max-w-[26rem] lg:max-w-[32rem]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none [field-sizing:content] w-fit max-w-full bg-transparent border border-transparent rounded-md pl-2 pr-7 py-1 text-base font-semibold text-foreground leading-tight cursor-pointer hover:bg-muted/35 transition-colors focus:outline-none focus:ring-2 focus:ring-ring truncate"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 h-3 w-3 text-muted-foreground pointer-events-none" />
    </div>
  );
}

/* ── Notices sheet ──────────────────────────────────────────────── */
function NoticesSheet({
  notices,
  courseId,
  notifications,
  onMarkNotificationsAsRead,
}: {
  notices: any[];
  courseId: number;
  notifications: any[];
  onMarkNotificationsAsRead: (notificationIds: number[]) => void;
}) {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const unreadNotificationsByNoticeId = useMemo(() => {
    const byNoticeId = new Map<string, number[]>();
    let unreadCount = 0;
    const currentCourseId = String(courseId);
    const courseNoticeIds = new Set(
      (Array.isArray(notices) ? notices : [])
        .map((notice: any) => notice?.id)
        .filter((noticeId: unknown) => noticeId != null)
        .map((noticeId: unknown) => String(noticeId)),
    );

    const allNotifications = Array.isArray(notifications) ? notifications : [];
    allNotifications.forEach((notification: any) => {
      if (notification?.isRead) return;

      const target = extractNoticeNotificationTarget(notification);
      if (!target.noticeId) return;
      if (!courseNoticeIds.has(target.noticeId)) return;
      if (target.courseId && target.courseId !== currentCourseId) return;

      unreadCount += 1;

      const notificationIdNumber = Number(notification?.id);
      if (Number.isFinite(notificationIdNumber) && notificationIdNumber > 0) {
        const existing = byNoticeId.get(target.noticeId) ?? [];
        existing.push(notificationIdNumber);
        byNoticeId.set(target.noticeId, existing);
      }
    });

    return { byNoticeId, unreadCount };
  }, [courseId, notifications, notices]);

  const timelineNotices = useMemo(() => {
    return notices
      .map((notice, index) => {
        const publishedAt = extractNoticeDate(notice);
        const titleFromHtml = htmlToText(notice?.content).slice(0, 120);
        const title = typeof notice?.title === 'string' && notice.title.trim()
          ? notice.title.trim()
          : titleFromHtml || 'Notice';

        return {
          id: notice?.id ?? `notice-${index}`,
          title,
          content: typeof notice?.content === 'string' ? notice.content : '',
          publishedAt,
          originalIndex: index,
        };
      })
      .sort((a, b) => {
        const aTime = a.publishedAt?.getTime();
        const bTime = b.publishedAt?.getTime();
        const dateFactor = sortOrder === 'newest' ? -1 : 1;

        if (aTime != null && bTime != null) {
          if (aTime !== bTime) return (aTime - bTime) * dateFactor;
          return (a.originalIndex - b.originalIndex) * dateFactor;
        }

        if (aTime != null) return -1 * dateFactor;
        if (bTime != null) return 1 * dateFactor;

        // Keep backend order when no timestamp is available.
        return a.originalIndex - b.originalIndex;
      });
  }, [notices, sortOrder]);

  const groupedTimeline = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      items: typeof timelineNotices;
    }> = [];

    timelineNotices.forEach((notice) => {
      const key = notice.publishedAt
        ? `${notice.publishedAt.getFullYear()}-${notice.publishedAt.getMonth()}-${notice.publishedAt.getDate()}`
        : 'undated';
      const label = notice.publishedAt ? formatNoticeDayLabel(notice.publishedAt) : 'Date unavailable';

      const currentGroup = groups[groups.length - 1];
      if (currentGroup && currentGroup.key === key) {
        currentGroup.items.push(notice);
      } else {
        groups.push({ key, label, items: [notice] });
      }
    });

    return groups;
  }, [timelineNotices]);

  const missingDateCount = timelineNotices.filter((n) => !n.publishedAt).length;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-2 border-border/40 hover:bg-muted/50 text-muted-foreground shadow-sm">
          <Bell className="w-4 h-4 text-foreground/80" />
          <span className="font-medium text-foreground/80 hidden sm:inline-block">Notices</span>
          {unreadNotificationsByNoticeId.unreadCount > 0 && (
            <Badge variant="outline" className="px-1.5 min-w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 text-primary pointer-events-none">
              {unreadNotificationsByNoticeId.unreadCount > 99 ? '99+' : unreadNotificationsByNoticeId.unreadCount}
            </Badge>
          )}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-[100dvh] w-full max-w-sm sm:max-w-md bg-background border-l border-border shadow-2xl p-6 sm:p-8 flex flex-col gap-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-medium tracking-tight flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> Course Notices
              </Dialog.Title>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                className="rounded-full h-8 px-2.5 text-xs gap-1.5"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
              </Button>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" /><span className="sr-only">Close</span>
                </Button>
              </Dialog.Close>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {timelineNotices.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                <Bell className="w-12 h-12 mb-4 opacity-20" />
                <p>No notices available.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {missingDateCount > 0 && (
                  <div className="text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded-lg px-3 py-2">
                    {missingDateCount} notice{missingDateCount > 1 ? 's' : ''} without a publish date are shown in backend order.
                  </div>
                )}

                {groupedTimeline.map((group) => (
                  <section key={group.key}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{group.label}</h4>
                      <span className="text-[11px] text-muted-foreground/80">{group.items.length}</span>
                    </div>

                    <div className="relative ml-2 pl-4 border-l border-border/60 space-y-3">
                      {group.items.map((notice) => (
                        <article
                          key={String(notice.id)}
                          className={`relative p-4 rounded-xl border transition-colors ${
                            (unreadNotificationsByNoticeId.byNoticeId.get(String(notice.id))?.length ?? 0) > 0
                              ? 'bg-primary/5 border-primary/25 hover:bg-primary/10'
                              : 'bg-muted/20 border-border/50 hover:bg-muted/35'
                          }`}
                          onClick={() => {
                            const notificationIds = unreadNotificationsByNoticeId.byNoticeId.get(String(notice.id)) ?? [];
                            if (notificationIds.length > 0) {
                              onMarkNotificationsAsRead(notificationIds);
                            }
                          }}
                        >
                          <span className="absolute -left-[22px] top-4 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />

                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h5 className="text-sm font-semibold text-foreground leading-tight">{notice.title}</h5>
                            {(unreadNotificationsByNoticeId.byNoticeId.get(String(notice.id))?.length ?? 0) > 0 && (
                              <Badge className="h-5 px-1.5 text-[10px] rounded-full bg-primary/15 text-primary border border-primary/30">
                                New
                              </Badge>
                            )}
                          </div>

                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-2.5">
                            <Clock3 className="h-3 w-3" />
                            {notice.publishedAt
                              ? `Received ${formatNoticeTimestamp(notice.publishedAt)}`
                              : 'Received date unavailable'}
                          </p>

                          <div
                            className="text-xs text-muted-foreground leading-relaxed prose prose-sm max-w-none [&_p]:my-1.5 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline"
                            dangerouslySetInnerHTML={{ __html: notice.content }}
                          />
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CourseInfoSheet({
  course,
  staff,
  guideSections,
  yearOptions,
  teachingPeriodLabel,
  usefulLinks,
}: {
  course: any;
  staff: StaffPerson[];
  guideSections: GuideSectionItem[];
  yearOptions: AcademicYearOption[];
  teachingPeriodLabel?: string;
  usefulLinks: UsefulLinkItem[];
}) {
  const courseId = Number(course?.id);
  const teachers = staff.filter((s) => !s.role || s.role.toLowerCase().includes('tit') || s.role.toLowerCase().includes('teacher') || s.role.toLowerCase().includes('docente'));
  const collaborators = staff.filter((s) => s.role && (s.role.toLowerCase().includes('col') || s.role.toLowerCase().includes('assist')));
  const displayTeachers = teachers.length > 0 ? teachers : staff;

  const detailRows: Array<{ label: string; value: string }> = [
    { label: 'Code', value: String(course?.shortcode ?? 'N/A') },
    { label: 'Credits', value: course?.cfu ?? course?.credits ? `${course?.cfu ?? course?.credits} CFU` : 'N/A' },
    { label: 'Year', value: course?.year ?? course?.academicYear ? String(course?.year ?? course?.academicYear) : 'N/A' },
    { label: 'Teaching period', value: teachingPeriodLabel ?? 'N/A' },
    { label: 'Type', value: typeof course?.courseType === 'string' ? course.courseType : 'N/A' },
    { label: 'Modules', value: Array.isArray(course?.modules) ? String(course.modules.length) : '0' },
    { label: 'Previous editions', value: Array.isArray(course?.previousEditions) ? String(course.previousEditions.length) : '0' },
  ];

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-2 border-border/40 hover:bg-muted/50 text-muted-foreground shadow-sm">
          <BookOpen className="w-4 h-4 text-foreground/80" />
          <span className="font-medium text-foreground/80 hidden sm:inline-block">Course Info</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-[100dvh] w-full max-w-md sm:max-w-xl lg:max-w-2xl bg-background border-l border-border shadow-2xl p-6 sm:p-8 flex flex-col gap-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-medium tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Course Info
              </Dialog.Title>
              <p className="text-xs text-muted-foreground mt-1 truncate">{course?.name ?? 'Course details'}</p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" /><span className="sr-only">Close</span>
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-5">
            <section className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Useful links</h3>
              {usefulLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No useful links available.</p>
              ) : (
                <div className="space-y-2">
                  {usefulLinks.map((link) => {
                    const host = getUrlHost(link.url);
                    return (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2 hover:bg-muted/35 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{link.label}</p>
                          {host && <p className="text-[11px] text-muted-foreground truncate">{host}</p>}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                      </a>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Overview</h3>
              <div className="space-y-2.5">
                {detailRows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-xs text-right text-foreground max-w-[65%]">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Academic editions</h3>
              {yearOptions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {yearOptions.map((opt) => (
                    <Badge key={opt.value} variant="outline" className="text-[10px] px-1.5">{opt.label}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No editions available.</p>
              )}
            </section>

            <section className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Professors</h3>
              {displayTeachers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No professor data available.</p>
              ) : (
                <TooltipProvider>
                  <div className="space-y-2">
                    {displayTeachers.map((person, index) => (
                      <div key={`${person.staffIdRaw}-${index}`} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Tooltip delayDuration={120}>
                            <TooltipTrigger asChild>
                              {person.profileHref ? (
                                <a href={person.profileHref} target="_blank" rel="noreferrer" className="text-sm text-primary hover:text-primary/80 transition-colors underline decoration-dotted underline-offset-2">
                                  {person.displayName}
                                </a>
                              ) : (
                                <button type="button" className="text-sm text-left text-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-2">
                                  {person.displayName}
                                </button>
                              )}
                            </TooltipTrigger>
                            <TooltipContent side="left" className="w-80 p-0 border border-border bg-card text-foreground shadow-xl">
                              <div className="p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-14 w-14 border border-border/60">
                                    {person.picture ? <AvatarImage src={person.picture} alt={person.displayName} /> : null}
                                    <AvatarFallback>{initialsFromName(person.displayName)}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground leading-tight">{person.displayName}</p>
                                    {person.role ? <p className="text-xs text-muted-foreground mt-0.5">{person.role}</p> : null}
                                  </div>
                                </div>

                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                  {person.department ? (
                                    <p className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{person.department}</p>
                                  ) : null}
                                  {person.email ? (
                                    <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{person.email}</p>
                                  ) : null}
                                  {person.phone ? (
                                    <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{person.phone}</p>
                                  ) : null}
                                </div>

                                {person.profileHref ? (
                                  <a
                                    href={person.profileHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                                  >
                                    Open PoliTO profile <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                              </div>
                            </TooltipContent>
                          </Tooltip>

                          {person.role ? <p className="text-[11px] text-muted-foreground mt-0.5">{person.role}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </TooltipProvider>
              )}
              {collaborators.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-3">+{collaborators.length} collaborator{collaborators.length > 1 ? 's' : ''}</p>
              )}
            </section>

            <section className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Guide</h3>
              {guideSections.length === 0 ? (
                <p className="text-xs text-muted-foreground">No guide content available.</p>
              ) : (
                <div className="space-y-3">
                  {guideSections.map((section, index) => (
                    <article key={`${section.title}-${index}`} className="rounded-lg border border-border/60 bg-background/70 p-3">
                      <h4 className="text-xs font-semibold text-foreground mb-1.5">{section.title}</h4>
                      <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{section.content}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {Number.isFinite(courseId) && courseId > 0 && (
              <Button variant="outline" asChild className="w-full rounded-xl">
                <Link href={`/courses/${courseId}/info`}>Open full Course Info page</Link>
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const id = parseInt(courseId, 10);
  const { data: course, isLoading } = useGetCourse(id);
  const { data: courses = [] } = useGetCourses();
  const { data: notices = [] } = useGetCourseNotices(id);
  const { data: courseGuide = [] } = useGetCourseGuide(id);
  const { data: notifications = [] } = useGetNotifications();
  const { focusMode } = useToolkitStore();
  const markNotificationAsRead = useMarkNotificationAsRead();

  const searchParams = useSearchParams();

  // ── Persistent state via URL search params ─────────────────────────────
  const [isChatOpen, setIsChatOpen] = useState(() => searchParams.get('chat') === '1');
  const [selectedAcademicValue, setSelectedAcademicValue] = useState<string>(() => searchParams.get('year') ?? '');
  const initialMaterialsTab = (searchParams.get('tab') ?? 'teaching') as 'teaching' | 'dropbox' | 'virtual';
  const initialViewMode = (searchParams.get('view') ?? 'list') as 'list' | 'grid';
  const initialSidebarCollapsed = searchParams.get('sidebar') === '1';
  
  const initialExpandedFolders = useMemo(() => searchParams.get('folders')?.split(',').filter(Boolean) ?? [], [searchParams]);
  const initialGridFolderStack = useMemo(() => searchParams.get('grid')?.split(',').filter(Boolean) ?? [], [searchParams]);
  const initialPreviewId = searchParams.get('preview') ?? null;
  const chatRef = usePanelRef();
  const chatOnResize = useSnapOnRelease(chatRef, CHAT_SNAPS);



  // ── Sync state back to URL (silent replace, no history entry) ──────
  const syncUrl = useCallback((overrides: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(overrides).forEach(([key, value]) => {
      if (value === null || value === '' || value === '0') params.delete(key);
      else params.set(key, value);
    });
    const qs = params.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router]);

  const toggleChat = useCallback((next: boolean) => {
    setIsChatOpen(next);
    syncUrl({ chat: next ? '1' : null });
  }, [syncUrl]);

  useEffect(() => {
    const onExternalToggle = () => toggleChat(!isChatOpen);
    window.addEventListener('course-ai-assistant-toggle', onExternalToggle);
    return () => window.removeEventListener('course-ai-assistant-toggle', onExternalToggle);
  }, [isChatOpen, toggleChat]);

  const onTabChange = useCallback((tab: string) => {
    syncUrl({ tab: tab === 'teaching' ? null : tab });
  }, [syncUrl]);

  const onViewModeChange = useCallback((mode: string) => {
    syncUrl({ view: mode === 'list' ? null : mode });
  }, [syncUrl]);

  const onSidebarChange = useCallback((collapsed: boolean) => {
    syncUrl({ sidebar: collapsed ? '1' : null });
  }, [syncUrl]);

  const onExpandedFoldersChange = useCallback((folders: string[]) => {
    syncUrl({ folders: folders.length > 0 ? folders.join(',') : null });
  }, [syncUrl]);

  const onGridFolderStackChange = useCallback((stack: string[]) => {
    syncUrl({ grid: stack.length > 0 ? stack.join(',') : null });
  }, [syncUrl]);

  const onPreviewIdChange = useCallback((previewId: string | null) => {
    syncUrl({ preview: previewId });
  }, [syncUrl]);

  const markNotificationsAsRead = useCallback((notificationIds: number[]) => {
    const unique = Array.from(new Set(notificationIds.filter((idValue) => Number.isFinite(idValue) && idValue > 0)));
    unique.forEach((notificationId) => {
      markNotificationAsRead.mutate(notificationId);
    });
  }, [markNotificationAsRead]);

  const c = course as any;
  const usefulLinks = useMemo(() => getUsefulLinksFromCourseData(c, Array.isArray(courseGuide) ? courseGuide : []), [c, courseGuide]);
  const guideSections = useMemo(() => normalizeGuideSections(Array.isArray(courseGuide) ? courseGuide : []), [courseGuide]);
  const coursesPool = useMemo(() => {
    const list = Array.isArray(courses) ? (courses as any[]) : [];
    const modules = list.flatMap((courseItem) => Array.isArray(courseItem?.modules) ? courseItem.modules : []);
    return [...modules, ...list].filter(Boolean);
  }, [courses]);

  const linkedCourse = useMemo(() => {
    return coursesPool.find((courseItem: any) => {
      if (Number(courseItem?.id) === id) return true;
      const previous = Array.isArray(courseItem?.previousEditions) ? courseItem.previousEditions : [];
      return previous.some((edition: any) => Number(edition?.id) === id);
    });
  }, [coursesPool, id]);

  const yearOptions = useMemo<AcademicYearOption[]>(() => {
    const options: AcademicYearOption[] = [];
    const seen = new Set<string>();

    const pushOption = (editionId: unknown, editionYear: unknown) => {
      const numericId = Number(editionId);
      if (!Number.isFinite(numericId) || numericId <= 0) return;

      const yearNumber = Number(editionYear);
      const label = Number.isFinite(yearNumber) && yearNumber > 1900
        ? formatAcademicYearLabel(yearNumber)
        : `Edition ${numericId}`;

      const value = String(numericId);
      if (seen.has(value)) return;
      seen.add(value);

      options.push({
        value,
        label,
        courseId: numericId,
        apiYear: Number.isFinite(yearNumber) && yearNumber > 1900 ? String(yearNumber) : undefined,
      });
    };

    // Prefer official-style linkage from the full courses list.
    pushOption(linkedCourse?.id ?? c?.id ?? id, linkedCourse?.year ?? c?.year);

    const previous = Array.isArray(linkedCourse?.previousEditions)
      ? linkedCourse.previousEditions
      : Array.isArray(c?.previousEditions)
        ? c.previousEditions
        : [];
    previous.forEach((edition: any) => pushOption(edition?.id, edition?.year));

    options.sort((a, b) => {
      const ay = Number(a.apiYear ?? 0);
      const by = Number(b.apiYear ?? 0);
      return by - ay;
    });

    if (options.length === 0) {
      options.push({ value: String(id), label: 'Current', courseId: id });
    }

    return options;
  }, [linkedCourse?.id, linkedCourse?.year, linkedCourse?.previousEditions, c?.id, c?.year, c?.previousEditions, id]);

  useEffect(() => {
    if (!yearOptions.length) return;
    const stillValid = yearOptions.some((opt) => opt.value === selectedAcademicValue);
    if (!stillValid) {
      const routeEdition = yearOptions.find((opt) => opt.courseId === id);
      const next = (routeEdition ?? yearOptions[0]).value;
      setSelectedAcademicValue(next);
      syncUrl({ year: next });
    }
  }, [id, selectedAcademicValue, yearOptions, syncUrl]);

  const selectedYearOption = useMemo(() => {
    return yearOptions.find((opt) => opt.value === selectedAcademicValue) ?? yearOptions[0];
  }, [selectedAcademicValue, yearOptions]);

  const selectedApiYear = selectedYearOption?.apiYear ?? toApiYear(selectedYearOption?.label ?? '');
  const selectedEditionCourseId = selectedYearOption?.courseId ?? id;

  const courseSwitchOptions = useMemo<CourseSwitchOption[]>(() => {
    const options = new Map<number, CourseSwitchOption>();
    const list = Array.isArray(courses) ? (courses as any[]) : [];

    const pushOption = (courseItem: any) => {
      const rawCourseId = courseItem?.id ?? courseItem?.courseId;
      const numericCourseId = Number(rawCourseId);
      if (!Number.isFinite(numericCourseId) || numericCourseId <= 0) return;
      if (options.has(numericCourseId)) return;

      options.set(numericCourseId, {
        value: String(numericCourseId),
        courseId: numericCourseId,
        label: buildCourseSwitchLabel(courseItem, numericCourseId),
      });
    };

    list.forEach(pushOption);

    if (!options.has(id)) {
      pushOption({
        id,
        shortcode: c?.shortcode,
        code: c?.code,
        name: c?.name,
        title: c?.title,
        cfu: c?.cfu,
        credits: c?.credits,
      });
    }

    return Array.from(options.values());
  }, [courses, id, c?.shortcode, c?.code, c?.name, c?.title, c?.cfu, c?.credits]);

  const selectedCourseSwitchValue = useMemo(() => {
    const hasCurrent = courseSwitchOptions.some((opt) => opt.courseId === id);
    if (hasCurrent) return String(id);
    return courseSwitchOptions[0]?.value ?? String(id);
  }, [courseSwitchOptions, id]);

  const onCourseSwitch = useCallback((nextCourseValue: string) => {
    const nextCourseId = Number(nextCourseValue);
    if (!Number.isFinite(nextCourseId) || nextCourseId <= 0) return;
    if (nextCourseId === id) return;
    router.push(`/courses/${nextCourseId}`);
  }, [id, router]);

  const staffBase = useMemo<StaffBaseEntry[]>(() => {
    const raw = Array.isArray(c?.staff) ? (c.staff as any[]) : [];
    return raw.map((item: any): StaffBaseEntry => {
      const idRaw = item?.id ?? item?.personId;
      const idText = idRaw == null ? '' : String(idRaw).trim();
      const numericId = Number(idText);
      return {
        idRaw: idText,
        numericId: Number.isFinite(numericId) && numericId > 0 ? numericId : undefined,
        role: typeof item?.role === 'string' ? item.role : undefined,
        name: typeof item?.name === 'string' ? item.name : undefined,
        email: typeof item?.email === 'string' ? item.email : undefined,
      };
    });
  }, [c?.staff]);

  const staffIds = useMemo<number[]>(() => {
    const ids = staffBase
      .map((entry: StaffBaseEntry) => entry.numericId)
      .filter((entry: number | undefined): entry is number => typeof entry === 'number');
    return Array.from(new Set<number>(ids));
  }, [staffBase]);

  const staffPersonQueries = useQueries({
    queries: staffIds.map((personId) => ({
      queryKey: ['person', personId],
      queryFn: () => (getApiClient() as any).getPerson(personId).then((r: any) => r.data),
      enabled: !!personId,
      staleTime: 10 * 60 * 1000,
    })),
  });

  const staffPersonsById = useMemo(() => {
    const map = new Map<number, any>();
    staffIds.forEach((personId, index) => {
      const personData = staffPersonQueries[index]?.data;
      if (personData) map.set(personId, personData);
    });
    return map;
  }, [staffIds, staffPersonQueries]);

  const staff: StaffPerson[] = useMemo(() => {
    return staffBase.map((base: StaffBaseEntry, index: number) => {
      const person = base.numericId ? staffPersonsById.get(base.numericId) : undefined;
      const personParam = toPolitoPersonParam(base.idRaw || person?.id);
      const profileHref = personParam ? `https://www.polito.it/personale?p=${encodeURIComponent(personParam)}` : undefined;
      const personPhone = Array.isArray(person?.phoneNumbers)
        ? person.phoneNumbers.find((p: any) => p?.full)?.full
        : undefined;
      const firstName = typeof person?.firstName === 'string' ? person.firstName : undefined;
      const lastName = typeof person?.lastName === 'string' ? person.lastName : undefined;
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      return {
        staffIdRaw: base.idRaw || String(index),
        staffIdNumber: base.numericId,
        displayName: fullName || base.name || `Person ${base.idRaw || index + 1}`,
        role: typeof person?.role === 'string' ? person.role : base.role,
        email: typeof person?.email === 'string' ? person.email : base.email,
        picture: typeof person?.picture === 'string' ? person.picture : undefined,
        department: typeof person?.facilityShortName === 'string' ? person.facilityShortName : undefined,
        phone: typeof personPhone === 'string' ? personPhone : undefined,
        profileHref,
      };
    });
  }, [staffBase, staffPersonsById]);

  const courseTeachingPeriod = c?.teachingPeriod ?? c?.period;
  const courseTeachingPeriodLabel = formatTeachingPeriod(courseTeachingPeriod);
  const coursePeriodBadge = getPeriodBadgeValue(courseTeachingPeriod);
  const courseYearBadge = c?.year ?? c?.academicYear;

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[2px] w-24 bg-primary/30 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-primary/70 rounded-full" style={{ animation: 'loading-bar 1.2s ease-in-out infinite' }} />
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="absolute inset-0 flex flex-col gap-4 items-center justify-center">
        <p className="text-muted-foreground font-medium">Course not found</p>
        <Button variant="outline" asChild><Link href="/courses">Back to courses</Link></Button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      {/* ── Header ──────────────────────────────────────────────── */}
      {!focusMode.isActive && (
        <div className="bg-card border-b border-border shrink-0">
          <div className="px-4 md:px-6 py-2.5 flex items-center gap-4">
            {/* Course info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-nowrap">
                <CourseTitleSelect
                  value={selectedCourseSwitchValue}
                  onChange={onCourseSwitch}
                  options={courseSwitchOptions}
                />
                {coursePeriodBadge && (
                  <Badge variant="outline" className="h-5 px-2 rounded-full text-[10px] leading-none border-border/60 text-foreground/80 bg-muted/20 shrink-0">
                    Period: {coursePeriodBadge}
                  </Badge>
                )}
                {courseYearBadge && (
                  <Badge variant="outline" className="h-5 px-2 rounded-full text-[10px] leading-none border-border/60 text-foreground/80 bg-muted/20 shrink-0">
                    Course: {courseYearBadge}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <AcademicYearSelect
                value={selectedYearOption?.value ?? ''}
                onChange={(v) => { setSelectedAcademicValue(v); syncUrl({ year: v }); }}
                options={yearOptions}
              />
              <CourseInfoSheet
                course={c}
                staff={staff}
                guideSections={guideSections}
                yearOptions={yearOptions}
                teachingPeriodLabel={courseTeachingPeriodLabel}
                usefulLinks={usefulLinks}
              />
              <NoticesSheet
                notices={notices as any[]}
                courseId={id}
                notifications={notifications as any[]}
                onMarkNotificationsAsRead={markNotificationsAsRead}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={isChatOpen ? "65%" : "100%"} className="flex flex-col min-w-0 h-full">
            <MaterialsTab
              key={`materials-${selectedEditionCourseId}-${selectedApiYear ?? 'na'}`}
              courseId={String(selectedEditionCourseId)}
              year={selectedApiYear}
              initialTab={initialMaterialsTab}
              onTabChange={onTabChange}
              initialViewMode={initialViewMode}
              onViewModeChange={onViewModeChange}
              initialSidebarCollapsed={initialSidebarCollapsed}
              onSidebarChange={onSidebarChange}
              initialExpandedFolders={initialExpandedFolders}
              onExpandedFoldersChange={onExpandedFoldersChange}
              initialGridFolderStack={initialGridFolderStack}
              onGridFolderStackChange={onGridFolderStackChange}
              initialPreviewId={initialPreviewId}
              onPreviewIdChange={onPreviewIdChange}
            />
          </ResizablePanel>

          {isChatOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize="35%"
                minSize="280px"
                panelRef={chatRef}
                onResize={chatOnResize}
                className="flex flex-col border-l border-border bg-background"
              >
                <ChatWindow courseId={courseId} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
