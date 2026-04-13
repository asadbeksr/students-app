import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/stores/examStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, FileQuestion, Play, Trash2, ChevronDown, ChevronUp, Eye, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import CreateExamDialog from './CreateExamDialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ExamListProps {
  courseId: string;
  onStartExam: (examId: string) => void;
}

export default function ExamList({ courseId, onStartExam }: ExamListProps) {
  const { exams, attempts, fetchExams, fetchAttempts, deleteExam } = useExamStore();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchExams(courseId);
    fetchAttempts(courseId);
  }, [courseId, fetchExams, fetchAttempts]);

  const getAttemptCount = (examId: string) => {
    return attempts.filter(a => a.examId === examId).length;
  };

  const getBestScore = (examId: string) => {
    const examAttempts = attempts.filter(a => a.examId === examId && a.completedAt);
    if (examAttempts.length === 0) return null;
    return Math.max(...examAttempts.map(a => a.analytics.scorePercentage));
  };

  const handleDelete = async (examId: string) => {
    if (confirm('Are you sure you want to delete this exam?')) {
      await deleteExam(examId);
    }
  };

  const toggleExpanded = (examId: string) => {
    const newExpanded = new Set(expandedExams);
    if (newExpanded.has(examId)) {
      newExpanded.delete(examId);
    } else {
      newExpanded.add(examId);
    }
    setExpandedExams(newExpanded);
  };

  const getExamAttempts = (examId: string) => {
    return attempts
      .filter(a => a.examId === examId && a.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreTrend = (examAttempts: typeof attempts, currentIndex: number) => {
    if (currentIndex >= examAttempts.length - 1) return null;
    const current = examAttempts[currentIndex].analytics.scorePercentage;
    const previous = examAttempts[currentIndex + 1].analytics.scorePercentage;
    const diff = current - previous;
    if (Math.abs(diff) < 1) return { icon: Minus, color: 'text-gray-500', text: 'Same' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-green-600', text: `+${diff.toFixed(0)}%` };
    return { icon: TrendingDown, color: 'text-red-600', text: `${diff.toFixed(0)}%` };
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Mock Exams</h2>
            <p className="text-muted-foreground mt-1.5">Test your knowledge and track your progress</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Create Exam
          </Button>
        </div>

        {exams.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardHeader className="text-center py-12">
              <CardTitle className="text-xl">No exams yet</CardTitle>
              <CardDescription className="text-base mt-2">
                Create your first mock exam to test your knowledge
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam) => {
              const attemptCount = getAttemptCount(exam.id);
              const bestScore = getBestScore(exam.id);
              const examAttempts = getExamAttempts(exam.id);
              const isExpanded = expandedExams.has(exam.id);

              return (
                <Card key={exam.id} className="hover:shadow-lg transition-all hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {exam.name}
                        </CardTitle>
                        <CardDescription className="mt-2 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <FileQuestion className="h-4 w-4" />
                            {exam.questions.length} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {exam.duration} minutes
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {bestScore !== null && (
                          <Badge variant="secondary">
                            Best: {bestScore}%
                          </Badge>
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(exam.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-muted-foreground">
                        {attemptCount} attempt{attemptCount !== 1 ? 's' : ''}
                      </div>
                      <Button onClick={() => onStartExam(exam.id)} className="gap-2">
                        <Play className="h-4 w-4" />
                        Start Exam
                      </Button>
                    </div>

                    {examAttempts.length > 0 && (
                      <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(exam.id)}>
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-between p-2 h-auto hover:bg-muted"
                          >
                            <span className="text-sm font-medium">
                              View Attempt History ({examAttempts.length})
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3">
                          <div className="space-y-2">
                            {examAttempts.map((attempt, index) => {
                              const trend = getScoreTrend(examAttempts, index);
                              const scorePercentage = attempt.analytics.scorePercentage;
                              const isPassing = scorePercentage >= 60;

                              return (
                                <div
                                  key={attempt.id}
                                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge 
                                        variant={isPassing ? "default" : "destructive"}
                                        className="font-semibold"
                                      >
                                        {scorePercentage.toFixed(0)}%
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {attempt.score}/{attempt.totalQuestions} correct
                                      </span>
                                      {trend && (
                                        <div className={`flex items-center gap-1 ${trend.color}`}>
                                          <trend.icon className="h-3 w-3" />
                                          <span className="text-xs font-medium">{trend.text}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(attempt.completedAt!)}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/course/${courseId}/exam/${exam.id}/results/${attempt.id}`)}
                                    className="gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Results
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <CreateExamDialog
          courseId={courseId}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </div>
  );
}
