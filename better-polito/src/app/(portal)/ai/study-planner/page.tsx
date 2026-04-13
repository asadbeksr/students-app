import { StudyPlanner } from '@/components/ai/StudyPlanner';

export default function StudyPlannerPage() {
  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-3xl font-light text-black">Study Planner</h1>
        <p className="text-sm text-[#777169] mt-1">AI-powered personalized study schedule based on your exams and performance.</p>
      </div>
      <StudyPlanner />
    </div>
  );
}
