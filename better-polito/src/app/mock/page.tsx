import Link from 'next/link';
import { SUBJECTS } from '@/config/subjects';
import { ArrowRight, BookOpen, PenLine, Timer } from 'lucide-react';

export default function MockSubjectsPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">Exam prep</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a subject to start a mock exam. Defaults mirror the real PoliTO exam timing and question count.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUBJECTS.map((s) => (
          <Link
            key={s.slug}
            href={`/mock/${s.slug}`}
            className="group rounded-xl border border-border/60 bg-card p-5 transition hover:border-primary/60 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold group-hover:text-primary">{s.name}</h2>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            {s.description && (
              <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {s.modes.mcq && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5">
                  <BookOpen className="h-3 w-3" /> MCQ · {s.modes.mcq.questionCount}q ·{' '}
                  <Timer className="h-3 w-3" />
                  {s.modes.mcq.durationMin}m
                </span>
              )}
              {s.modes.written && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5">
                  <PenLine className="h-3 w-3" /> Written · {s.modes.written.questionCount}q
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
