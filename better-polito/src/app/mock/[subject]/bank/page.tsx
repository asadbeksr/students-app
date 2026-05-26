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

  const bankQuestions = questions.map((q) => ({
    id: q.id,
    question_text: q.question_text,
    difficulty: q.difficulty,
    language: q.language,
    topics: q.topics,
    year: q.year,
    has_formula: q.has_formula,
    has_diagram: q.has_diagram,
  }));

  return <QuestionBank subject={subject} questions={bankQuestions} facets={facets} />;
}
