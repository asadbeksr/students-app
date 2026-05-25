'use client';
import { useEffect } from 'react';

export function PrintTrigger() {
  useEffect(() => {
    // Small timeout to allow KaTeX to render and images to load
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  return null;
}
