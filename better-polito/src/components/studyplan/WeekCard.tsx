import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Calendar } from 'lucide-react';
import type { StudyPlan, Material } from '@/types';
import { format } from 'date-fns';

interface WeekCardProps {
  week: StudyPlan['weeks'][0];
  materials: Material[];
}

export default function WeekCard({ week, materials }: WeekCardProps) {
  const completedTopics = week.topics.filter(t => t.isCompleted).length;
  const totalTopics = week.topics.length;
  const completionPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const getMaterialName = (materialId: string) => {
    return materials.find(m => m.id === materialId)?.name || 'Unknown';
  };

  return (
    <Card className={week.isReviewWeek ? 'border-primary border-2' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle>Week {week.weekNumber}</CardTitle>
              {week.isReviewWeek && (
                <Badge variant="default">Review Week</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(week.startDate), 'MMM d')} - {format(new Date(week.endDate), 'MMM d')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{completionPercentage}%</p>
            <p className="text-sm text-gray-600">
              {completedTopics}/{totalTopics} topics
            </p>
          </div>
        </div>
        <Progress value={completionPercentage} className="mt-3" />
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {week.topics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 mt-1">
                {topic.isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${topic.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                  {topic.name}
                </h4>
                
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {topic.allocatedHours}h
                  </Badge>
                  {topic.materials.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {topic.materials.length} material{topic.materials.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {topic.materials.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {topic.materials.map(materialId => (
                      <div key={materialId} className="flex items-center gap-2 text-xs text-gray-600">
                        <span>📚</span>
                        <span>{getMaterialName(materialId)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
