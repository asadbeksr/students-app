'use client';

import { useEffect, useRef } from 'react';
import { useToolkitStore, formatTime, playBeep } from '@/lib/stores/toolkitStore';

export function PomodoroTicker() {
  const pomodoro = useToolkitStore(s => s.pomodoro);
  const prevModeRef = useRef(pomodoro.mode);

  // tick interval
  useEffect(() => {
    if (pomodoro.mode !== 'work' && pomodoro.mode !== 'break') return;
    const id = setInterval(() => useToolkitStore.getState().tickTimer(), 1000);
    return () => clearInterval(id);
  }, [pomodoro.mode]);

  // sound on phase transition
  useEffect(() => {
    const prev = prevModeRef.current;
    const curr = pomodoro.mode;
    if (prev === 'work' && curr === 'break' && pomodoro.soundEnabled) playBeep('work');
    if (prev === 'break' && curr === 'idle' && pomodoro.soundEnabled) playBeep('break');
    prevModeRef.current = curr;
  }, [pomodoro.mode, pomodoro.soundEnabled]);

  // tab title while running
  useEffect(() => {
    if (pomodoro.mode === 'work' || pomodoro.mode === 'break') {
      const emoji = pomodoro.mode === 'work' ? '🍅' : '☕';
      document.title = `${emoji} ${formatTime(pomodoro.secondsLeft)} — Polito Community Portal`;
      return () => { document.title = 'Polito Community Portal'; };
    }
  }, [pomodoro.mode, pomodoro.secondsLeft]);

  return null;
}
