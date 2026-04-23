'use client';

import ChatWindow from '@/components/chat/ChatWindow';

export default function ChatbotPage() {
  return (
    <div className="-mx-4 -mt-4 lg:-mx-6 lg:-mt-6 -mb-20 h-[calc(100vh-52px)] overflow-hidden">
      <ChatWindow courseId="general" />
    </div>
  );
}
