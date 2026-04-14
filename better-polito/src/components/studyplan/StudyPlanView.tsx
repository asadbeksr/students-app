import { useEffect, useState } from 'react';
import { useCourseStore } from '@/stores/courseStore';
import { useMaterialStore } from '@/stores/materialStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Calendar, Clock, Target } from 'lucide-react';
import { generateStudyPlan, updateStudyPlanProgress } from '@/lib/studyPlan';
import WeekCard from './WeekCard';
import type { StudyPlan } from '@/types';

interface StudyPlanViewProps {
  courseId: string;
}

export default function StudyPlanView({ courseId }: StudyPlanViewProps) {
  const { selectedCourse, updateCourse } = useCourseStore();
  const { materials } = useMaterialStore();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCourse?.studyPlan) {
      const updatedPlan = updateStudyPlanProgress(
        selectedCourse.studyPlan,
        selectedCourse.progress.completedMaterials
      );
      setPlan(updatedPlan);
    }
  }, [selectedCourse]);

  const handleGenerate = async () => {
    if (!selectedCourse) return;

    setLoading(true);
    setError(null);

    try {
      const newPlan = generateStudyPlan(selectedCourse, materials);
      await updateCourse(courseId, { studyPlan: newPlan });
      setPlan(newPlan);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCourse) return null;

  if (!plan && !selectedCourse.studyPlan) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <Card className="border-dashed border-2">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <CardTitle>Generate Your Study Plan</CardTitle>
            </div>
            <CardDescription>
              Let AI create a personalized study plan based on your exam date, knowledge level, and materials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {materials.length === 0 && (
              <Alert>
                <AlertDescription>
                  Add some materials first to generate a better study plan.
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between py-3 border-t border-b border-border">
              <span className="text-sm text-muted-foreground">Exam Date</span>
              <span className="font-medium text-foreground">{new Date(selectedCourse.examDate).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Knowledge Level</span>
              <span className="font-medium text-foreground capitalize">{selectedCourse.knowledgeLevel}</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Materials</span>
              <span className="font-medium text-foreground">{materials.length} items</span>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full gap-2"
              size="lg"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Generating...' : 'Generate Study Plan'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plan) return null;

  const totalCompletedTopics = plan.weeks.reduce(
    (sum, week) => sum + week.topics.filter(t => t.isCompleted).length,
    0
  );
  const totalTopics = plan.weeks.reduce((sum, week) => sum + week.topics.length, 0);
  const completionPercentage = totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{plan.totalDays}</p>
                  <p className="text-sm text-gray-600">Days until exam</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{plan.totalHours}h</p>
                  <p className="text-sm text-gray-600">Total study time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{plan.hoursPerDay}h</p>
                  <p className="text-sm text-gray-600">Hours per day</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{completionPercentage}%</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Regenerate Button */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleGenerate} disabled={loading}>
            <Sparkles className="h-4 w-4 mr-2" />
            Regenerate Plan
          </Button>
        </div>

        {/* Weekly Plan */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Weekly Breakdown</h2>
          {plan.weeks.map((week) => (
            <WeekCard key={week.weekNumber} week={week} materials={materials} />
          ))}
        </div>
      </div>
    </div>
  );
}
