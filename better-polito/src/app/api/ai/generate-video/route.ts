import { getGeminiClient } from '@/lib/gemini';
import { readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const maxDuration = 300; // 5 min max for serverless

export async function POST(req: Request) {
  try {
    const ai = getGeminiClient();
    const { prompt, aspectRatio, resolution, duration } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send({ status: 'starting', message: 'Starting video generation...' });

          let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            config: {
              numberOfVideos: 1,
              aspectRatio: aspectRatio || '16:9',
              resolution: resolution || '720p',
              durationSeconds: duration || 8,
              personGeneration: 'allow_all',
            },
          });

          send({
            status: 'generating',
            message: 'Video is being generated...',
            operationName: operation.name,
          });

          // Poll until done
          let elapsed = 0;
          const pollInterval = 5000;
          const maxWait = 270000; // 4.5 min

          while (!operation.done && elapsed < maxWait) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            elapsed += pollInterval;

            operation = await ai.operations.get({ operation });

            send({
              status: 'generating',
              message: `Generating video... (${Math.round(elapsed / 1000)}s)`,
              elapsed: Math.round(elapsed / 1000),
            });
          }

          if (!operation.done) {
            send({ status: 'error', error: 'Video generation timed out. Please try again.' });
            controller.close();
            return;
          }

          if (operation.error) {
            send({ status: 'error', error: `Generation failed: ${JSON.stringify(operation.error)}` });
            controller.close();
            return;
          }

          const genVideos = operation.response?.generatedVideos;
          if (!genVideos?.length || !genVideos[0].video) {
            const reasons = operation.response?.raiMediaFilteredReasons;
            send({
              status: 'error',
              error: reasons?.length
                ? `Video blocked by safety filters: ${reasons.join(', ')}`
                : 'No video was generated. Try a different prompt.',
            });
            controller.close();
            return;
          }

          send({ status: 'downloading', message: 'Downloading generated video...' });

          const videoObj = genVideos[0].video;

          // Download to a temp file, then read bytes
          const tmpPath = join(tmpdir(), `veo-${Date.now()}.mp4`);
          try {
            await ai.files.download({ file: videoObj, downloadPath: tmpPath });
            const fileBuffer = readFileSync(tmpPath);
            const base64 = fileBuffer.toString('base64');
            unlinkSync(tmpPath); // clean up

            send({
              status: 'complete',
              video: {
                data: base64,
                mimeType: videoObj.mimeType || 'video/mp4',
              },
            });
          } catch (dlError) {
            // Clean up temp file on error
            try { unlinkSync(tmpPath); } catch {}

            // Fallback: return the URI if available
            if (videoObj.uri) {
              send({
                status: 'complete',
                video: {
                  uri: videoObj.uri,
                  mimeType: videoObj.mimeType || 'video/mp4',
                },
              });
            } else {
              throw dlError;
            }
          }
        } catch (error) {
          const msg = (error as Error).message || 'Unknown error';
          console.error('Video generation error:', msg);

          if (msg.includes('SAFETY') || msg.includes('safety')) {
            send({ status: 'error', error: 'Video was blocked by safety filters. Try a different prompt.' });
          } else if (msg.includes('GEMINI_API_KEY')) {
            send({ status: 'error', error: 'AI features require a Gemini API key.' });
          } else {
            send({ status: 'error', error: `Video generation failed: ${msg}` });
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const message = (error as Error).message || 'Unknown error';
    console.error('Video generation setup error:', message);
    return new Response(JSON.stringify({ error: `Video generation failed: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
