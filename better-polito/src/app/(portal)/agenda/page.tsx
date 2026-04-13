'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { DateTime } from 'luxon';
import { APP_TIMEZONE } from '@/lib/utils/dates';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(DateTime.now().setZone(APP_TIMEZONE));

  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const startDay = startOfMonth.weekday - 1; // 0-indexed Monday

  const daysInMonth = endOfMonth.day;
  const today = DateTime.now().setZone(APP_TIMEZONE);

  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-light text-black">Agenda</h1>
        <p className="text-sm text-[#777169] mt-1">Your calendar and upcoming events.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-light">
              {MONTHS[currentDate.month - 1]} {currentDate.year}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setCurrentDate(d => d.minus({ months: 1 }))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setCurrentDate(DateTime.now().setZone(APP_TIMEZONE))}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setCurrentDate(d => d.plus({ months: 1 }))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-[#777169] py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const isToday = day !== null &&
                day === today.day &&
                currentDate.month === today.month &&
                currentDate.year === today.year;
              return (
                <div
                  key={i}
                  className={`
                    aspect-square flex items-center justify-center rounded-xl text-sm cursor-pointer transition-colors
                    ${day === null ? '' : 'hover:bg-[#f5f5f5]'}
                    ${isToday ? 'bg-black text-white hover:bg-neutral-800 font-medium' : 'text-[#4e4e4e]'}
                  `}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming events placeholder */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" /> Upcoming</CardTitle></CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Calendar className="w-8 h-8 text-[#e5e5e5] mx-auto mb-2" />
            <p className="text-sm text-[#777169]">No upcoming events. Deadlines from courses will appear here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
