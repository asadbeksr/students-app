'use client';
import { useGetSurveys } from '@/lib/queries/surveysHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function SurveysPage() {
  const { data: surveys = [], isLoading } = useGetSurveys();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-light text-black">Surveys</h1>
        <p className="text-sm text-[#777169] mt-1">Course evaluation surveys to complete.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : (surveys as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="w-10 h-10 text-[#e5e5e5] mx-auto mb-3" />
            <p className="text-[#777169]">No surveys available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(surveys as any[]).map((s: any, i: number) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-black">{s.courseName || s.name}</p>
                  {s.expiresAt && <p className="text-xs text-[#777169] mt-1">Due: {new Date(s.expiresAt).toLocaleDateString()}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {s.isMandatory && <Badge variant="warning">Mandatory</Badge>}
                  {!s.isCompiled && (
                    <Button size="sm" onClick={() => toast.info('Survey will open in official portal')}>
                      Start
                    </Button>
                  )}
                  {s.isCompiled && <Badge variant="success">Done</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
