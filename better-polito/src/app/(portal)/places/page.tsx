'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useGetPlaceCategories, useGetPlaces } from '@/lib/queries/placesHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Search } from 'lucide-react';

// Leaflet map must be loaded dynamically (no SSR)
const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(m => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(m => m.Popup),
  { ssr: false }
);

export default function PlacesPage() {
  const { data: places = [], isLoading } = useGetPlaces();
  const [search, setSearch] = useState('');

  const filtered = (places as any[]).filter((p: any) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-light text-foreground">Campus Map</h1>
        <p className="text-sm text-muted-foreground mt-1">Find buildings, labs, and services on campus.</p>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <div className="h-80 bg-background relative">
          <div className="absolute inset-0 z-10">
            {typeof window !== 'undefined' && (
              <MapContainer
                center={[45.0626, 7.6596]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filtered.filter((p: any) => p.latitude && p.longitude).map((p: any) => (
                  <Marker key={p.id} position={[p.latitude, p.longitude]}>
                    <Popup>{p.name}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search places…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.slice(0, 24).map((place: any) => (
            <Card key={place.id} className="hover:shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(78,50,23,0.06)_0px_8px_24px] transition-shadow">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-warm flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{place.name}</p>
                  {place.type && <Badge variant="warm" className="mt-1 text-[10px]">{place.type}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
