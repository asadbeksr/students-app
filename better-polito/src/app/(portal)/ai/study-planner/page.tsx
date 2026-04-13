import { StudyPlanner } from '@/components/ai/StudyPlanner';

export default function StudyPlannerPage() {
  return (
    <div className="w-full space-y-4">
      <div>
        <h1 className="text-3xl font-light text-foreground">Study Planner</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered personalized study schedule based on your exams and performance.</p>
      </div>
      <StudyPlanner />
    </div>
  );
}
