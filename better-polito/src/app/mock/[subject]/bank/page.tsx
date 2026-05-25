import { notFound } from 'next/navigation';
import { getSubject } from '@/config/subjects';
import { loadSubjectQuestions, computeFacets } from '@/lib/exam/questions';
import { QuestionBank } from '@/components/exam/QuestionBank';

export default async function QuestionBankPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: subjectSlug } = await params;
  const subject = getSubject(subjectSlug);
  if (!subject) notFound();

  const questions = await loadSubjectQuestions(subject);
  const facets = computeFacets(questions);

  return <QuestionBank subject={subject} questions={questions} facets={facets} />;
}
