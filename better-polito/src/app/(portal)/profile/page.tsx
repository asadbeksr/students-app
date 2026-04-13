'use client';
import { useGetStudent, useGetGrades } from '@/lib/queries/studentHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, GraduationCap, BookOpen, TrendingUp, Mail } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const { data: student, isLoading } = useGetStudent();
  const { data: grades = [] } = useGetGrades();
  const s = student as any;
  const username = session?.user?.name ?? '';
  const initials = [s?.firstName?.[0], s?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || username.slice(0, 2).toUpperCase();

  const passedGrades = (grades as any[]).filter((g: any) => g.passed !== false && !isNaN(parseFloat(g.grade)));
  const weightedAvg = s?.weightedAverage ?? s?.mean ?? (
    passedGrades.length > 0
      ? (passedGrades.reduce((acc: number, g: any) => acc + parseFloat(g.grade), 0) / passedGrades.length).toFixed(2)
      : null
  );
  const acquiredCredits = s?.acquiredCredits ?? passedGrades.reduce((acc: number, g: any) => acc + (g.credits ?? 0), 0);
  const totalCredits = s?.totalCredits ?? null;

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-light text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Your student information.</p>
      </div>

      {/* Hero card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <Avatar className="w-16 h-16 text-lg">
              {s?.photoUrl && <AvatarImage src={s.photoUrl} alt={initials} />}
              <AvatarFallback className="text-xl bg-black text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-5 w-40 mt-2" />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-foreground">
                    {[s?.firstName, s?.lastName].filter(Boolean).join(' ') || username}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {s?.email ?? `${username}@studenti.polito.it`}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(s?.studentId ?? s?.regId ?? s?.registrationNumber) && (
                      <Badge variant="secondary">
                        {s.studentId ?? s.regId ?? s.registrationNumber}
                      </Badge>
                    )}
                    {s?.degreeName && <Badge variant="warm">{s.degreeName}</Badge>}
                    {(s?.degreeLevel ?? s?.courseType) && (
                      <Badge variant="outline">{s.degreeLevel ?? s.courseType}</Badge>
                    )}
                    {(s?.firstEnrollmentYear ?? s?.enrollmentYear) && (
                      <Badge variant="outline">Enrolled {s.firstEnrollmentYear ?? s.enrollmentYear}</Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Weighted Avg"
          value={isLoading ? null : weightedAvg ? `${weightedAvg}/30` : '—'}
        />
        <StatCard
          icon={BookOpen}
          label="Credits"
          value={isLoading ? null : acquiredCredits ? `${acquiredCredits}${totalCredits ? `/${totalCredits}` : ''}` : '—'}
        />
        <StatCard
          icon={GraduationCap}
          label="Exams passed"
          value={isLoading ? null : String(passedGrades.length || '—')}
        />
      </div>

      {/* Details */}
      {(isLoading || s) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              [
                ['Degree', s?.degreeName ?? s?.courseName],
                ['Department', s?.departmentName ?? s?.department],
                ['Degree code', s?.degreeCode ?? s?.courseCode],
                ['Year of course', s?.courseYear ?? s?.currentYear ?? s?.year],
                ['Academic year', s?.academicYear],
                ['Expected graduation', s?.expectedGraduationYear],
                ['Phone', s?.phoneNumber],
                ['Status', s?.status],
              ].filter(([, v]) => v != null).map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-2.5 border-b border-background last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground text-right max-w-[60%] truncate">{String(value)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        className="w-full border-red-200 text-red-600 hover:bg-red-50"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        {value === null ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          <p className="text-lg font-semibold text-foreground">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
