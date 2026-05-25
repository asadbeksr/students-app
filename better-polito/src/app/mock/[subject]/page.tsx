import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubject } from '@/config/subjects';
import { ArrowRight, BookOpen, PenLine, Timer } from 'lucide-react';

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;
  const cfg = getSubject(subject);
  if (!cfg) notFound();

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/mock" className="text-sm text-muted-foreground hover:text-foreground">
        ← All subjects
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{cfg.name}</h1>
      {cfg.description && (
        <p className="mt-2 text-sm text-muted-foreground">{cfg.description}</p>
      )}

      <div className="mt-8 space-y-4">
        {cfg.modes.mcq && (
          <Link
            href={`/mock/${cfg.slug}/mcq`}
            className="group flex items-center justify-between rounded-xl border border-border/60 bg-card p-5 transition hover:border-primary/60"
          >
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold group-hover:text-primary">
                  Multiple choice
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {cfg.modes.mcq.questionCount} questions ·{' '}
                <Timer className="inline h-3.5 w-3.5" /> {cfg.modes.mcq.durationMin}{' '}
                min
                {cfg.modes.mcq.passScore != null && (
                  <> · pass at {cfg.modes.mcq.passScore}%</>
                )}
              </p>
              {cfg.modes.mcq.scoring && (
                <p className="mt-1 text-xs text-muted-foreground">
                  +{cfg.modes.mcq.scoring.correct} correct ·{' '}
                  {cfg.modes.mcq.scoring.wrong} wrong ·{' '}
                  {cfg.modes.mcq.scoring.blank} blank
                </p>
              )}
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        )}

        {cfg.modes.written && (
          <Link
            href={`/mock/${cfg.slug}/written`}
            className="group flex items-center justify-between rounded-xl border border-border/60 bg-card p-5 transition hover:border-primary/60"
          >
            <div>
              <div className="flex items-center gap-2">
                <PenLine className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold group-hover:text-primary">
                  Written
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {cfg.modes.written.questionCount} questions ·{' '}
                <Timer className="inline h-3.5 w-3.5" />{' '}
                {cfg.modes.written.durationMin} min
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        )}
      </div>
    </section>
  );
}
