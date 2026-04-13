'use client';
import { useGetNews } from '@/lib/queries/newsHooks';
import { useGetJobOffers } from '@/lib/queries/jobOfferHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { Newspaper, Briefcase } from 'lucide-react';

export default function ServicesPage() {
  const { data: news = [], isLoading: newsLoading } = useGetNews();
  const { data: jobs = [], isLoading: jobsLoading } = useGetJobOffers();

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-light text-foreground">Services</h1>
        <p className="text-sm text-muted-foreground mt-1">News, announcements, and job offers.</p>
      </div>

      <Tabs defaultValue="news">
        <TabsList className="flex gap-1 p-1 bg-background rounded-full w-fit mb-6">
          <TabsTrigger
            value="news"
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-all data-[state=active]:bg-surface data-[state=active]:shadow-el-card text-text-muted data-[state=active]:text-foreground"
          >
            <Newspaper className="w-4 h-4" /> News
          </TabsTrigger>
          <TabsTrigger
            value="jobs"
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-all data-[state=active]:bg-surface data-[state=active]:shadow-el-card text-text-muted data-[state=active]:text-foreground"
          >
            <Briefcase className="w-4 h-4" /> Job Offers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="news">
          {newsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : (news as any[]).length === 0 ? (
            <div className="py-12 text-center"><p className="text-muted-foreground">No news available.</p></div>
          ) : (
            <div className="space-y-3">
              {(news as any[]).slice(0, 20).map((item: any) => (
                <Card key={item.id} className="hover:shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(78,50,23,0.06)_0px_8px_24px] transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-sm text-text-muted mt-1 line-clamp-2">{item.content || item.description}</p>
                        {item.publishedAt && (
                          <p className="text-xs text-muted-foreground mt-2">{new Date(item.publishedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                      {item.category && <Badge variant="warm" className="shrink-0">{item.category}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs">
          {jobsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : (jobs as any[]).length === 0 ? (
            <div className="py-12 text-center"><p className="text-muted-foreground">No job offers available.</p></div>
          ) : (
            <div className="space-y-3">
              {(jobs as any[]).slice(0, 20).map((job: any) => (
                <Card key={job.id} className="hover:shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(78,50,23,0.06)_0px_8px_24px] transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{job.title}</p>
                        {job.company && <p className="text-sm text-text-muted mt-0.5">{job.company}</p>}
                        {job.expiresAt && <p className="text-xs text-muted-foreground mt-1">Deadline: {new Date(job.expiresAt).toLocaleDateString()}</p>}
                      </div>
                      <Badge variant="secondary" className="shrink-0">{job.type ?? 'job'}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
