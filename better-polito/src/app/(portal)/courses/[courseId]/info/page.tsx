'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, CalendarDays, ExternalLink, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGetCourse, useGetCourseGuide, useGetCourses } from '@/lib/queries/courseHooks';
import { getApiClient } from '@/lib/api/client';

type AcademicYearOption = {
  value: string;
  label: string;
};

type StaffPerson = {
  staffIdRaw: string;
  displayName: string;
  role?: string;
  profileHref?: string;
};

type StaffBaseEntry = {
  idRaw: string;
  numericId?: number;
  role?: string;
  name?: string;
};

type GuideSectionItem = {
  title: string;
  content: string;
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

function formatTeachingPeriod(period: unknown): string | undefined {
  if (period == null) return undefined;
  const raw = String(period).trim();
  if (!raw) return undefined;
  const compact = raw.replace(/\s+/g, '');
  const full = compact.match(/^(\d+)[-/.](\d+)$/);
  if (full) return `${full[1]}st semester, ${full[2]}st slot`;
  if (/^\d+$/.test(compact)) return `${compact}st semester`;
  return raw;
}

function collectLinksFromText(text: unknown): string[] {
  if (typeof text !== 'string') return [];
  return text.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
}

function isLikelyMoodleUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('moodle') || lower.includes('didattica.polito.it');
}

function getMoodleLinkFromCourseData(course: any, guide: any[]): string | undefined {
  const candidates: string[] = [];

  [course?.moodleUrl, course?.moodle, course?.elearningUrl, course?.platformUrl, course?.url, course?.website, course?.courseUrl]
    .forEach((value) => {
      if (typeof value === 'string' && value.startsWith('http')) candidates.push(value);
    });

  const walk = (value: unknown, depth: number) => {
    if (depth > 3 || value == null) return;
    if (typeof value === 'string') {
      collectLinksFromText(value).forEach((url) => candidates.push(url));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, depth + 1));
      return;
    }
    if (typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach((item) => walk(item, depth + 1));
    }
  };

  walk(course, 0);
  walk(guide, 0);

  const unique = Array.from(new Set(candidates.filter((url) => /^https?:\/\//i.test(url))));
  return unique.find((url) => isLikelyMoodleUrl(url));
}

function normalizeGuideSections(guide: any[]): GuideSectionItem[] {
  return (Array.isArray(guide) ? guide : [])
    .map((section: any, index: number) => {
      const title = typeof section?.title === 'string' && section.title.trim() ? section.title.trim() : `Section ${index + 1}`;
      const content = (typeof section?.content === 'string' ? section.content : '')
        .replace(/[\f]+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return { title, content };
    })
    .filter((section) => section.content.length > 0);
}

export default function CourseInfoPage() {
  const params = useParams();
  const id = Number(params.courseId);

  const { data: course, isLoading } = useGetCourse(id);
  const { data: courses = [] } = useGetCourses();
  const { data: courseGuide = [] } = useGetCourseGuide(id);

  const c = course as any;

  const moodleUrl = useMemo(() => getMoodleLinkFromCourseData(c, Array.isArray(courseGuide) ? courseGuide : []), [c, courseGuide]);
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
    const seen = new Set<string>();
    const out: AcademicYearOption[] = [];

    const push = (editionId: unknown, editionYear: unknown) => {
      const numericId = Number(editionId);
      if (!Number.isFinite(numericId) || numericId <= 0) return;
      const value = String(numericId);
      if (seen.has(value)) return;
      seen.add(value);
      const year = Number(editionYear);
      out.push({ value, label: Number.isFinite(year) && year > 1900 ? formatAcademicYearLabel(year) : `Edition ${value}` });
    };

    push(linkedCourse?.id ?? c?.id ?? id, linkedCourse?.year ?? c?.year);
    const previous = Array.isArray(linkedCourse?.previousEditions)
      ? linkedCourse.previousEditions
      : Array.isArray(c?.previousEditions)
        ? c.previousEditions
        : [];
    previous.forEach((edition: any) => push(edition?.id, edition?.year));

    return out;
  }, [linkedCourse?.id, linkedCourse?.year, linkedCourse?.previousEditions, c?.id, c?.year, c?.previousEditions, id]);

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
      };
    });
  }, [c?.staff]);

  const staffIds = useMemo<number[]>(() => {
    const ids = staffBase
      .map((entry: { numericId?: number }) => entry.numericId)
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
      const firstName = typeof person?.firstName === 'string' ? person.firstName : undefined;
      const lastName = typeof person?.lastName === 'string' ? person.lastName : undefined;
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      const personParam = toPolitoPersonParam(base.idRaw || person?.id);
      return {
        staffIdRaw: base.idRaw || String(index),
        displayName: fullName || base.name || `Person ${base.idRaw || index + 1}`,
        role: typeof person?.role === 'string' ? person.role : base.role,
        profileHref: personParam ? `https://www.polito.it/personale?p=${encodeURIComponent(personParam)}` : undefined,
      };
    });
  }, [staffBase, staffPersonsById]);

  const teachers = staff.filter((s) => !s.role || s.role.toLowerCase().includes('tit') || s.role.toLowerCase().includes('teacher') || s.role.toLowerCase().includes('docente'));
  const collaborators = staff.filter((s) => s.role && (s.role.toLowerCase().includes('col') || s.role.toLowerCase().includes('assist')));
  const displayTeachers = teachers.length > 0 ? teachers : staff;

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading course info...</div>;
  }

  if (!c) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground">Course not found.</p>
        <Button variant="outline" asChild><Link href="/courses">Back to courses</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="rounded-full">
            <Link href={`/courses/${id}`}><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Course Info</h1>
        </div>
        {moodleUrl && (
          <Button variant="outline" size="sm" asChild className="rounded-full gap-2">
            <a href={moodleUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />Moodle
            </a>
          </Button>
        )}
      </div>

      <section className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Overview</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{c?.shortcode ?? 'N/A'}</Badge>
          {(c?.cfu ?? c?.credits) ? <Badge variant="outline">{c?.cfu ?? c?.credits} CFU</Badge> : null}
          {(c?.year ?? c?.academicYear) ? <Badge variant="outline">Year {c?.year ?? c?.academicYear}</Badge> : null}
          {formatTeachingPeriod(c?.teachingPeriod ?? c?.period) ? (
            <Badge variant="outline" className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatTeachingPeriod(c?.teachingPeriod ?? c?.period)}</Badge>
          ) : null}
          {typeof c?.courseType === 'string' ? <Badge variant="outline">{c.courseType}</Badge> : null}
          <Badge variant="outline">{Array.isArray(c?.modules) ? c.modules.length : 0} modules</Badge>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <h2 className="text-base font-semibold text-foreground inline-flex items-center gap-2"><GraduationCap className="h-4 w-4" />Professors</h2>
        {displayTeachers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No professor data available.</p>
        ) : (
          <div className="space-y-2">
            {displayTeachers.map((person, index) => (
              <div key={`${person.staffIdRaw}-${index}`}>
                {person.profileHref ? (
                  <a href={person.profileHref} target="_blank" rel="noreferrer" className="text-sm text-primary hover:text-primary/80 underline decoration-dotted underline-offset-2">{person.displayName}</a>
                ) : (
                  <p className="text-sm text-foreground">{person.displayName}</p>
                )}
                {person.role ? <p className="text-xs text-muted-foreground">{person.role}</p> : null}
              </div>
            ))}
          </div>
        )}
        {collaborators.length > 0 ? <p className="text-xs text-muted-foreground">+{collaborators.length} collaborator{collaborators.length > 1 ? 's' : ''}</p> : null}
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Academic editions</h2>
        <div className="flex flex-wrap gap-1.5">
          {yearOptions.map((option) => <Badge key={option.value} variant="outline">{option.label}</Badge>)}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Guide</h2>
        {guideSections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No guide content available.</p>
        ) : (
          <div className="space-y-3">
            {guideSections.map((section, index) => (
              <article key={`${section.title}-${index}`} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{section.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{section.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
