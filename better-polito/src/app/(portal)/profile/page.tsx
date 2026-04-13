'use client';
import { useGetStudent } from '@/lib/queries/studentHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSession, signOut } from 'next-auth/react';
import { getStudentEnrollmentYear } from '@/lib/utils/students';
import { LogOut, User } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const { data: student, isLoading } = useGetStudent();
  const studentData = student as any;
  const username = session?.user?.name ?? '';
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-light text-black">Profile</h1>
        <p className="text-sm text-[#777169] mt-1">Your student information.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <Avatar className="w-16 h-16 text-lg">
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-light text-black">
                    {[studentData?.firstName, studentData?.lastName].filter(Boolean).join(' ') || username}
                  </h2>
                  <p className="text-sm text-[#777169] mt-0.5">{username}@studenti.polito.it</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {studentData?.studentId && <Badge variant="secondary">ID: {studentData.studentId}</Badge>}
                    {studentData?.degreeName && <Badge variant="warm">{studentData.degreeName}</Badge>}
                    {studentData?.firstEnrollmentYear && (
                      <Badge variant="outline">Enrolled {getStudentEnrollmentYear(studentData)}</Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {studentData && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Degree', studentData.degreeName],
              ['Department', studentData.departmentName],
              ['Year', studentData.year],
              ['Status', studentData.status],
            ].filter(([, v]) => v != null).map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-[#f5f5f5] last:border-0">
                <span className="text-sm text-[#777169]">{label}</span>
                <span className="text-sm font-medium text-black">{String(value)}</span>
              </div>
            ))}
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
