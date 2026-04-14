import type { ExamAttempt, MCQQuestion, Material } from '@/types';

export function analyzeExamAttempt(
  attempt: ExamAttempt,
  questions: MCQQuestion[],
  materials: Material[]
): ExamAttempt['analytics'] {
  const { answers, totalQuestions } = attempt;

  // Calculate score percentage
  const correctCount = answers.filter(a => a.isCorrect).length;
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Topic breakdown
  const topicMap = new Map<string, { correct: number; total: number }>();
  
  questions.forEach((question, index) => {
    const answer = answers[index];
    const topic = question.topic;
    
    if (!topicMap.has(topic)) {
      topicMap.set(topic, { correct: 0, total: 0 });
    }
    
    const topicData = topicMap.get(topic)!;
    topicData.total++;
    if (answer.isCorrect) {
      topicData.correct++;
    }
  });

  const topicBreakdown = Array.from(topicMap.entries()).map(([topic, data]) => {
    const percentage = Math.round((data.correct / data.total) * 100);
    let strength: 'strong' | 'moderate' | 'weak';
    
    if (percentage >= 80) strength = 'strong';
    else if (percentage >= 60) strength = 'moderate';
    else strength = 'weak';

    return {
      topic,
      correct: data.correct,
      total: data.total,
      strength,
    };
  });

  // Identify weak areas (topics < 60%)
  const weakAreas = topicBreakdown
    .filter(t => t.strength === 'weak')
    .map(topic => {
      // Find materials related to this topic
      const relatedMaterials = materials.filter(m => 
        m.topics?.includes(topic.topic)
      ).map(m => ({
        materialId: m.id,
        materialName: m.name,
      }));

      return {
        topic: topic.topic,
        recommendedMaterials: relatedMaterials.slice(0, 3), // Top 3 materials
      };
    });

  return {
    scorePercentage,
    topicBreakdown,
    weakAreas,
  };
}

export function calculateDifficultyDistribution(questions: MCQQuestion[]): Record<string, number> {
  const distribution = { easy: 0, medium: 0, hard: 0 };
  
  questions.forEach(q => {
    distribution[q.difficulty]++;
  });

  return distribution;
}
