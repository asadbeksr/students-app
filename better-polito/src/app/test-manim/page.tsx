"use client";
import { useEffect, useState } from "react";
import { ManimFrame } from "@/components/chat/ManimFrame";

export default function TestManim() {
  const [script, setScript] = useState("");
  useEffect(() => {
    fetch('/test-user-code.js').then(r => r.text()).then(setScript);
  }, []);
  
  if (!script) return null;
  return <div className="p-8"><ManimFrame script={script} title="Test" /></div>;
}
