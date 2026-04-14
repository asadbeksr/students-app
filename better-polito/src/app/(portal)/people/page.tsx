'use client';
import { useState } from 'react';
import { useGetPeople } from '@/lib/queries/peopleHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Search } from 'lucide-react';

export default function PeoplePage() {
  const [search, setSearch] = useState('');
  const { data: people = [], isLoading } = useGetPeople(search, search.length >= 2);

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <div>
        <h1 className="text-3xl font-light text-foreground">People</h1>
        <p className="text-sm text-muted-foreground mt-1">Search professors, staff, and students.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name (min 2 chars)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {search.length < 2 ? (
        <div className="py-16 text-center">
          <Users className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-muted-foreground">Type at least 2 characters to search.</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : (people as any[]).length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No results for &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(people as any[]).map((person: any) => (
            <Card key={person.id} className="hover:shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(78,50,23,0.06)_0px_8px_24px] transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>
                    {[person.firstName?.[0], person.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{[person.firstName, person.lastName].filter(Boolean).join(' ')}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {person.role && <Badge variant="secondary" className="text-[10px]">{person.role}</Badge>}
                    {person.email && <span className="text-xs text-muted-foreground">{person.email}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
