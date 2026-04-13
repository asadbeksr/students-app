import { useState } from 'react';
import { useExamStore } from '@/stores/examStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { MCQQuestion } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface CreateExamDialogProps {
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateExamDialog({ courseId, open, onOpenChange }: CreateExamDialogProps) {
  const { createExam } = useExamStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    duration: 60,
  });

  // Sample question for demo
  const sampleQuestions: MCQQuestion[] = [
    {
      id: uuidv4(),
      questionText: 'What is the limit of sin(x)/x as x approaches 0?',
      options: [
        { id: 'A', text: '0' },
        { id: 'B', text: '1' },
        { id: 'C', text: '∞' },
        { id: 'D', text: 'Does not exist' },
      ],
      correctAnswer: 'B',
      explanation: 'This is a fundamental limit in calculus. Using L\'Hôpital\'s rule or the squeeze theorem, we can prove that lim(x→0) sin(x)/x = 1.',
      topic: 'Limits',
      difficulty: 'medium',
    },
    {
      id: uuidv4(),
      questionText: 'What is the derivative of x²?',
      options: [
        { id: 'A', text: 'x' },
        { id: 'B', text: '2x' },
        { id: 'C', text: 'x²' },
        { id: 'D', text: '2' },
      ],
      correctAnswer: 'B',
      explanation: 'Using the power rule: d/dx(x^n) = nx^(n-1), we get d/dx(x²) = 2x¹ = 2x.',
      topic: 'Derivatives',
      difficulty: 'easy',
    },
    {
      id: uuidv4(),
      questionText: 'Which of the following functions is continuous everywhere?',
      options: [
        { id: 'A', text: '1/x' },
        { id: 'B', text: 'tan(x)' },
        { id: 'C', text: 'x²' },
        { id: 'D', text: 'floor(x)' },
      ],
      correctAnswer: 'C',
      explanation: 'Polynomial functions like x² are continuous everywhere on the real line. The other options have discontinuities at various points.',
      topic: 'Continuity',
      difficulty: 'medium',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Please enter an exam name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await createExam({
        courseId,
        name: formData.name,
        duration: formData.duration,
        questions: sampleQuestions,
      });
      
      toast({
        title: 'Success',
        description: 'Exam created successfully',
      });
      
      onOpenChange(false);
      setFormData({ name: '', duration: 60 });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create exam',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Mock Exam</DialogTitle>
            <DialogDescription>
              Create a new exam with sample questions (AI generation coming soon!)
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Exam Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Midterm Practice"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              This will create a sample exam with 3 questions. AI-powered question generation from your materials coming soon!
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Exam'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
