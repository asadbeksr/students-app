import { notFound } from 'next/navigation';
import { getSubject } from '@/config/subjects';
import { loadSubjectQuestions } from '@/lib/exam/questions';
import { MathText } from '@/components/exam/MathText';
import { PrintTrigger } from './PrintTrigger';

export default async function PrintView({
  params,
  searchParams,
}: {
  params: Promise<{ subject: string }>;
  searchParams: Promise<{ ids?: string; mode?: string }>;
}) {
  const { subject: subjectSlug } = await params;
  const { ids, mode } = await searchParams;

  const subject = getSubject(subjectSlug);
  if (!subject || !ids) notFound();

  const isAnswerKey = mode === 'answer_key';
  const idArray = ids.split(',').map((id) => id.trim());
  const allQuestions = await loadSubjectQuestions(subject);
  
  // Create a map to preserve the order in which they were requested (optional) or just filter.
  const questionMap = new Map(allQuestions.map(q => [q.id, q]));
  const questions = idArray.map(id => questionMap.get(id)).filter((q) => q !== undefined) as typeof allQuestions;

  return (
    <div className="print-view">
      <link rel="stylesheet" href="/moodle/runner.css" />
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; margin: 0; padding: 0; }
          .print-view { padding: 0; }
          .page-break { page-break-inside: avoid; }
        }
        .print-view {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1d2125;
        }
        .print-header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #f7941d; padding-bottom: 20px; }
        .print-header h1 { margin: 0 0 10px; font-size: 24px; }
        .print-header p { margin: 0; color: #6c757d; }
        
        .question-block { margin-bottom: 30px; }
        .q-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 12px; }
        .q-body { background: #f8f9fa; border: 1px solid #dee2e6; padding: 16px; border-radius: 6px; }
        .q-text { font-size: 16px; margin-bottom: 16px; }
        .q-options { list-style: none; padding: 0; margin: 0; }
        .q-options li { display: flex; gap: 8px; margin-bottom: 8px; }
        .q-label { font-weight: bold; }
        
        .answer-key-box { margin-top: 16px; background: #e8f4fd; border: 1px solid #b8daff; padding: 12px; border-radius: 4px; }
        .answer-key-box h4 { margin: 0 0 8px; color: #004085; font-size: 14px; }
      `}} />

      <div className="print-header">
        <h1>{subject.name} - Question Bank Export</h1>
        <p>{isAnswerKey ? 'Answer Key' : 'Practice Sheet'} • {questions.length} Questions</p>
      </div>

      {questions.map((q, index) => (
        <div key={q.id} className="question-block page-break">
          <div className="q-header">
            <span>Question {index + 1}</span>
            <span style={{ color: '#6c757d', fontSize: '12px' }}>ID: {q.id}</span>
          </div>
          <div className="q-body">
            <div className="q-text">
              <MathText text={q.question_text} />
              {q.question_image && (
                <div style={{ marginTop: 12 }}>
                  <img src={q.question_image} alt="Diagram" style={{ maxWidth: '100%', maxHeight: 300 }} />
                </div>
              )}
            </div>
            
            {q.options && q.options.length > 0 && (
              <ul className="q-options">
                {q.options.map((opt) => {
                  const isCorrect = isAnswerKey && opt.label === q.correct_answer;
                  return (
                    <li key={opt.label} style={isCorrect ? { background: '#d4edda', padding: '4px 8px', borderRadius: '4px', margin: '-4px -8px 4px -8px' } : {}}>
                      <span className="q-label">{opt.label}.</span>
                      <MathText text={opt.text} />
                    </li>
                  );
                })}
              </ul>
            )}

            {isAnswerKey && (
              <div className="answer-key-box">
                {q.correct_answer && <h4>Correct answer: {q.correct_answer}</h4>}
                {q.solution && (
                  <div>
                    <h4 style={{ color: '#383d41', marginTop: 12 }}>Solution:</h4>
                    <MathText text={q.solution} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      
      <PrintTrigger />
    </div>
  );
}
