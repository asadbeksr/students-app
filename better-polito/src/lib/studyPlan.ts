import type { Course, Material, StudyPlan } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, addDays, format } from 'date-fns';

export function generateStudyPlan(course: Course, materials: Material[]): StudyPlan {
  const now = new Date();
  const examDate = new Date(course.examDate);
  const daysUntilExam = differenceInDays(examDate, now);
  
  if (daysUntilExam < 1) {
    throw new Error('Exam date must be in the future');
  }

  // Extract unique topics from materials
  const topicsSet = new Set<string>();
  materials.forEach(m => {
    if (m.topics) {
      m.topics.forEach(t => topicsSet.add(t));
    }
  });
  const topics = Array.from(topicsSet);
  
  // If no topics found, create generic ones based on materials
  const finalTopics = topics.length > 0 ? topics : materials.map(m => m.name);

  // Calculate hours needed based on knowledge level
  const hoursPerTopic: Record<string, number> = {
    beginner: 4,
    intermediate: 2.5,
    advanced: 1.5,
  };

  const baseHoursPerTopic = hoursPerTopic[course.knowledgeLevel];
  const totalHours = finalTopics.length * baseHoursPerTopic * 1.2; // 20% buffer

  // Calculate weeks (minimum 1, reserve last week for review)
  const totalWeeks = Math.max(2, Math.floor(daysUntilExam / 7));
  const studyWeeks = totalWeeks - 1; // Last week is for review
  const hoursPerDay = totalHours / daysUntilExam;

  // Distribute topics across study weeks
  const topicsPerWeek = Math.ceil(finalTopics.length / studyWeeks);
  
  const weeks: StudyPlan['weeks'] = [];

  // Study weeks
  for (let i = 0; i < studyWeeks; i++) {
    const weekStart = addDays(now, i * 7);
    const weekEnd = addDays(weekStart, 6);
    const weekTopics = finalTopics.slice(i * topicsPerWeek, (i + 1) * topicsPerWeek);

    weeks.push({
      weekNumber: i + 1,
      startDate: format(weekStart, 'yyyy-MM-dd'),
      endDate: format(weekEnd, 'yyyy-MM-dd'),
      topics: weekTopics.map(topicName => {
        // Find materials related to this topic
        const relatedMaterials = materials.filter(m => 
          m.topics?.includes(topicName) || m.name === topicName
        );

        return {
          id: uuidv4(),
          name: topicName,
          allocatedHours: baseHoursPerTopic,
          materials: relatedMaterials.map(m => m.id),
          isCompleted: false,
        };
      }),
      isReviewWeek: false,
    });
  }

  // Review week
  const reviewWeekStart = addDays(now, studyWeeks * 7);
  const reviewWeekEnd = examDate;
  
  weeks.push({
    weekNumber: totalWeeks,
    startDate: format(reviewWeekStart, 'yyyy-MM-dd'),
    endDate: format(reviewWeekEnd, 'yyyy-MM-dd'),
    topics: [
      {
        id: uuidv4(),
        name: 'Review all topics',
        allocatedHours: totalHours * 0.2, // 20% for review
        materials: materials.map(m => m.id),
        isCompleted: false,
      },
      {
        id: uuidv4(),
        name: 'Practice mock exams',
        allocatedHours: totalHours * 0.1, // 10% for exams
        materials: [],
        isCompleted: false,
      },
    ],
    isReviewWeek: true,
  });

  return {
    id: uuidv4(),
    courseId: course.id,
    generatedAt: new Date().toISOString(),
    examDate: course.examDate,
    totalDays: daysUntilExam,
    totalHours: Math.round(totalHours),
    hoursPerDay: Math.round(hoursPerDay * 10) / 10,
    weeks,
  };
}

export function updateStudyPlanProgress(
  plan: StudyPlan,
  completedMaterialIds: string[]
): StudyPlan {
  const updatedWeeks = plan.weeks.map(week => ({
    ...week,
    topics: week.topics.map(topic => ({
      ...topic,
      isCompleted: topic.materials.length > 0 
        ? topic.materials.every(materialId => completedMaterialIds.includes(materialId))
        : false,
    })),
  }));

  return {
    ...plan,
    weeks: updatedWeeks,
  };
}
