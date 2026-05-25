import { notFound } from 'next/navigation';
import { getSubject } from '@/config/subjects';
import type { ExamMode } from '@/types/exam';
import { ExamGate } from '@/components/exam/ExamGate';

export default async function ExamRunnerPage({
  params,
}: {
  params: Promise<{ subject: string; mode: string }>;
}) {
  const { subject, mode } = await params;
  const cfg = getSubject(subject);
  if (!cfg) notFound();
  const examMode = mode as ExamMode;
  const modeCfg = cfg.modes[examMode];
  if (!modeCfg) notFound();

  return <ExamGate subject={cfg} mode={examMode} modeCfg={modeCfg} />;
}
