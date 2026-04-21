'use client';

import { useSettingsStore } from '@/stores/settingsStore';
import { X, Zap, Brain, Microscope, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ChatSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSettingsPanel({ isOpen, onClose }: ChatSettingsPanelProps) {
  const { settings, setAiModel, setAiPersonality, setCustomSystemPrompt, updateSettings } = useSettingsStore();

  if (!isOpen || !settings) return null;

  const personalityOptions = [
    { value: 'broski' as const, label: 'Bro', desc: 'Casual & hype' },
    { value: 'bestie' as const, label: 'Bestie', desc: 'Warm & supportive' },
    { value: 'professor' as const, label: 'Professor', desc: 'Academic & formal' },
  ];

  const intensityOptions = [
    { value: 'a' as const, label: 'Mild' },
    { value: 'b' as const, label: 'Medium' },
    { value: 'c' as const, label: 'Max' },
  ];

  return (
    <div className="absolute inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-xs bg-card border-l border-border shadow-xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">AI Settings</h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAiModel('gemini-flash-latest')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${
                  settings.aiModel === 'gemini-flash-latest'
                    ? 'border-yellow-500/50 bg-yellow-500/10 text-foreground'
                    : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                <Zap className={`w-4 h-4 ${settings.aiModel === 'gemini-flash-latest' ? 'text-yellow-500' : ''}`} />
                <div className="text-left">
                  <div className="font-medium text-xs">Flash</div>
                  <div className="text-[10px] text-muted-foreground">Fast</div>
                </div>
              </button>
              <button
                onClick={() => setAiModel('gemini-pro-latest')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${
                  settings.aiModel === 'gemini-pro-latest'
                    ? 'border-purple-500/50 bg-purple-500/10 text-foreground'
                    : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                <Brain className={`w-4 h-4 ${settings.aiModel === 'gemini-pro-latest' ? 'text-purple-500' : ''}`} />
                <div className="text-left">
                  <div className="font-medium text-xs">Pro</div>
                  <div className="text-[10px] text-muted-foreground">Smart</div>
                </div>
              </button>
            </div>
          </div>

          {/* Personality */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Personality</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {personalityOptions.map(p => (
                <button
                  key={p.value}
                  onClick={() => setAiPersonality(p.value)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    settings.aiPersonality === p.value
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="text-xs font-medium">{p.label}</div>
                  <div className="text-[10px] text-muted-foreground">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Intensity</Label>
            <div className="flex gap-1.5">
              {intensityOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateSettings({ personalityIntensity: opt.value })}
                  className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                    settings.personalityIntensity === opt.value
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modes */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modes</Label>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="w-4 h-4 text-green-500" />
                <span className="text-sm">Visual Mode</span>
              </div>
              <Switch
                checked={settings.visualMode?.enabled ?? true}
                onCheckedChange={(checked) => {
                  const current = settings.visualMode || {
                    enabled: true,
                    animationsEnabled: true,
                    autoExpandBlocks: true,
                    preferredBlockSize: 'normal' as const,
                  };
                  updateSettings({ visualMode: { ...current, enabled: checked } });
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">🎞️</span>
                <span className="text-sm">GIFs</span>
              </div>
              <Switch
                checked={settings.gifsEnabled}
                onCheckedChange={(checked) => updateSettings({ gifsEnabled: checked })}
              />
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Custom Instructions
            </Label>
            <textarea
              value={settings.customSystemPrompt || ''}
              onChange={(e) => {
                const value = e.target.value.slice(0, 500);
                setCustomSystemPrompt(value || null);
              }}
              placeholder="Add custom instructions for your AI tutor..."
              className="w-full h-24 px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {(settings.customSystemPrompt || '').length}/500
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
