'use client';

import { useSettingsStore } from '@/stores/settingsStore';
import { X, Zap, Brain, LineChart, ImageIcon, Video, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface ChatSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSettingsPanel({ isOpen, onClose }: ChatSettingsPanelProps) {
  const { settings, setAiModel, setCustomSystemPrompt, updateSettings } = useSettingsStore();
  const [imageSettingsOpen, setImageSettingsOpen] = useState(false);
  const [videoSettingsOpen, setVideoSettingsOpen] = useState(false);

  if (!isOpen || !settings) return null;

  const imageGenerationEnabled = settings.imageGeneration ?? false;
  const videoGenerationEnabled = settings.videoGeneration ?? false;

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
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${settings.aiModel === 'gemini-flash-latest'
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
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${settings.aiModel === 'gemini-pro-latest'
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
                <span className="text-sm">🎥</span>
                <span className="text-sm">Manim Animations</span>
              </div>
              <Switch
                checked={settings.manimMode ?? false}
                onCheckedChange={(checked) => updateSettings({ manimMode: checked })}
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

          {/* Generation */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Generation</Label>

            {/* Image Generation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className={`w-4 h-4 ${imageGenerationEnabled ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <span className="text-sm">Image Generation</span>
                  <span className="text-[10px]">🍌</span>
                </div>
                <Switch
                  checked={imageGenerationEnabled}
                  onCheckedChange={(checked) => {
                    if (checked && videoGenerationEnabled) {
                      updateSettings({ imageGeneration: true, videoGeneration: false });
                    } else {
                      updateSettings({ imageGeneration: checked });
                    }
                  }}
                />
              </div>

              {/* Image Settings (collapsible) */}
              {imageGenerationEnabled && (
                <Collapsible open={imageSettingsOpen} onOpenChange={setImageSettingsOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors text-xs text-muted-foreground">
                    <span>Settings</span>
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${imageSettingsOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-3 pl-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground font-medium">Model</label>
                      <div className="flex gap-1.5">
                        <span className="flex-1 text-center px-2 py-1.5 rounded-md text-[11px] font-medium border border-orange-500/40 bg-orange-500/10 text-orange-400">
                          Nano Banana 2
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70">Gemini 3.1 Flash Image — generates and edits images inline</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground font-medium">Tips</label>
                      <ul className="text-[10px] text-muted-foreground/70 space-y-0.5 list-disc pl-3">
                        <li>Attach reference images for visual context</li>
                        <li>Be descriptive — include colors, style, layout</li>
                        <li>Works best for diagrams, charts, and illustrations</li>
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            {/* Video Generation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className={`w-4 h-4 ${videoGenerationEnabled ? 'text-cyan-500' : 'text-muted-foreground'}`} />
                  <span className="text-sm">Video Generation</span>
                  <span className="text-[10px]">🎬</span>
                </div>
                <Switch
                  checked={videoGenerationEnabled}
                  onCheckedChange={(checked) => {
                    if (checked && imageGenerationEnabled) {
                      updateSettings({ videoGeneration: true, imageGeneration: false });
                    } else {
                      updateSettings({ videoGeneration: checked });
                    }
                  }}
                />
              </div>

              {/* Video Settings (collapsible) */}
              {videoGenerationEnabled && (
                <Collapsible open={videoSettingsOpen} onOpenChange={setVideoSettingsOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors text-xs text-muted-foreground">
                    <span>Settings</span>
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${videoSettingsOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-3 pl-1">

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground font-medium">Model</label>
                      <div className="flex gap-1.5">
                        <span className="flex-1 text-center px-2 py-1.5 rounded-md text-[11px] font-medium border border-cyan-500/40 bg-cyan-500/10 text-cyan-400">
                          Veo 3.1 Fast
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70">High-fidelity 8s videos with native audio generation</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground font-medium">Aspect Ratio</label>
                      <div className="flex gap-1.5">
                        {(['16:9', '9:16'] as const).map((ratio) => (
                          <button
                            key={ratio}
                            onClick={() => updateSettings({ videoAspectRatio: ratio })}
                            className={`flex-1 text-center px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                              (settings.videoAspectRatio || '16:9') === ratio
                                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                                : 'border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {ratio === '16:9' ? '⬛ 16:9' : '⬜ 9:16'}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground/70">
                        {(settings.videoAspectRatio || '16:9') === '16:9' ? 'Landscape — ideal for lectures & demos' : 'Portrait — ideal for quick study clips'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground font-medium">Duration</label>
                      <div className="flex gap-1.5">
                        {([4, 6, 8] as const).map((dur) => (
                          <button
                            key={dur}
                            onClick={() => updateSettings({ videoDuration: dur })}
                            className={`flex-1 text-center px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                              (settings.videoDuration || 8) === dur
                                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                                : 'border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {dur}s
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground font-medium">Resolution</label>
                      <div className="flex gap-1.5">
                        {(['720p', '1080p'] as const).map((res) => (
                          <button
                            key={res}
                            onClick={() => updateSettings({ videoResolution: res })}
                            className={`flex-1 text-center px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                              (settings.videoResolution || '720p') === res
                                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                                : 'border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground/70">
                        {(settings.videoResolution || '720p') === '1080p' ? '1080p — higher quality, slower generation' : '720p — fast generation, good quality'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground font-medium">Prompting Tips</label>
                      <ul className="text-[10px] text-muted-foreground/70 space-y-0.5 list-disc pl-3">
                        <li>Specify camera angles: <em>close-up, wide shot, aerial</em></li>
                        <li>Add audio cues: <em>&quot;narrator explains…&quot;</em></li>
                        <li>Include motion: <em>panning, zooming, tracking</em></li>
                        <li>Set the style: <em>3D animation, cinematic, diagram</em></li>
                      </ul>
                    </div>

                  </CollapsibleContent>
                </Collapsible>
              )}
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
                const value = e.target.value;
                setCustomSystemPrompt(value || null);
              }}
              placeholder="Add custom instructions for your AI tutor..."
              className="w-full min-h-[120px] px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
