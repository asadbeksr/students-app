import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SUBJECTS } from '@/config/subjects';
import { ArrowRight, GraduationCap, BookOpen, Timer } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-5 w-5 text-primary" />
            better-polito
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/mock">Exam prep</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Login to portal</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Unofficial · community-built
          </p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            A better way to study at Politecnico di Torino
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Log in with your PoliTO credentials to access the portal — or jump
            straight into exam prep with timed mock exams built from real
            past-exam questions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/mock">
                Try a mock exam <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Login to portal</Link>
            </Button>
          </div>
        </div>

        <div className="mt-20">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Exam prep</h2>
              <p className="text-sm text-muted-foreground">
                Pick a subject. No login needed.
              </p>
            </div>
            <Link
              href="/mock"
              className="text-sm font-medium text-primary hover:underline"
            >
              All subjects →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SUBJECTS.map((s) => (
              <Link
                key={s.slug}
                href={`/mock/${s.slug}`}
                className="group rounded-xl border border-border/60 bg-card p-5 transition hover:border-primary/60 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold group-hover:text-primary">
                    {s.name}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                {s.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {s.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {s.modes.mcq && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5">
                      <BookOpen className="h-3 w-3" /> MCQ ·{' '}
                      {s.modes.mcq.questionCount}q ·{' '}
                      <Timer className="h-3 w-3" />
                      {s.modes.mcq.durationMin}m
                    </span>
                  )}
                  {s.modes.written && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5">
                      Written · {s.modes.written.questionCount}q
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Unofficial community project — not affiliated with Politecnico di Torino.
      </footer>
    </div>
  );
}
