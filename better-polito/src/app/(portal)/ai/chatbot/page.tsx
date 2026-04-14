import { ChatBot } from '@/components/ai/ChatBot';
import { Card } from '@/components/ui/card';

export default function ChatbotPage() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-3xl font-light text-foreground">AI Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">Ask questions about your studies, university services, and more.</p>
      </div>
      <Card className="h-[600px] flex flex-col overflow-hidden">
        <ChatBot />
      </Card>
      <p className="text-xs text-muted-foreground text-center">
        AI responses are generated and may not always be accurate. Always verify important information.
      </p>
    </div>
  );
}
