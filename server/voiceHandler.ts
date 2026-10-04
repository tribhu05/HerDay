import type { IncomingMessage, ServerResponse } from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Ensures environment variables from .env are loaded into process.env if present.
 */
export function loadEnvFile(rootDir = process.cwd()): void {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const equalIdx = trimmed.indexOf('=');
        if (equalIdx > 0) {
          const key = trimmed.slice(0, equalIdx).trim();
          let val = trimmed.slice(equalIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Returns whether ElevenLabs is configured without revealing the key.
 */
export function getElevenLabsApiKey(): string | undefined {
  loadEnvFile();
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  return key || undefined;
}

/**
 * Status endpoint handler: GET /api/voice/status
 */
export async function handleVoiceStatus(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const apiKey = getElevenLabsApiKey();
  const isConfigured = Boolean(apiKey);

  const payload = {
    configured: isConfigured,
    status: isConfigured ? 'Connected' : 'Not configured',
    model: 'scribe_v2',
    details: isConfigured
      ? 'ElevenLabs Scribe v2 is configured and ready.'
      : 'ELEVENLABS_API_KEY is not set. Add it to your .env file to enable voice input.',
  };

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify(payload));
}

/**
 * Transcribe endpoint handler: POST /api/voice/transcribe
 * Forwards audio blob to ElevenLabs Scribe STT API securely server-side.
 */
export async function handleVoiceTranscribe(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const apiKey = getElevenLabsApiKey();

  if (!apiKey) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 503;
    res.end(
      JSON.stringify({
        error: 'ElevenLabs API key is not configured. Set ELEVENLABS_API_KEY in your .env file.',
      })
    );
    return;
  }

  try {
    // Collect binary audio payload from client
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'No audio payload received in request.' }));
      return;
    }

    const mimeType = (req.headers['content-type'] as string) || 'audio/webm';
    const extension = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'mp4' : 'webm';
    const requestedModel = (req.headers['x-audio-model'] as string) || 'scribe_v2';

    // Construct FormData for ElevenLabs API
    const formData = new FormData();
    const fileBlob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', fileBlob, `recording.${extension}`);
    formData.append('model_id', requestedModel);

    // Call official ElevenLabs Speech-to-Text API
    const elevenResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
    });

    if (!elevenResponse.ok) {
      let errorMessage = `ElevenLabs API returned HTTP ${elevenResponse.status}: ${elevenResponse.statusText}`;
      try {
        const errorJson = (await elevenResponse.json()) as Record<string, unknown>;
        const detail = errorJson.detail as { message?: string } | undefined;
        if (detail?.message) {
          errorMessage = detail.message;
        } else if (typeof errorJson.message === 'string') {
          errorMessage = errorJson.message;
        } else if (typeof errorJson.error === 'string') {
          errorMessage = errorJson.error;
        }
      } catch {
        if (elevenResponse.status === 401) {
          errorMessage = 'ElevenLabs authentication failed. Verify that ELEVENLABS_API_KEY in .env is valid.';
        } else if (elevenResponse.status === 429) {
          errorMessage = 'ElevenLabs rate limit or quota exceeded. Please check your account usage.';
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = elevenResponse.status;
      res.end(JSON.stringify({ error: errorMessage }));
      return;
    }

    const data = (await elevenResponse.json()) as { text?: string; language_code?: string };
    const transcribedText = (data.text || '').trim();

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        text: transcribedText,
        provider: 'ElevenLabs Scribe',
        model: requestedModel,
        language_code: data.language_code,
      })
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ error: `Internal transcription proxy error: ${msg}` }));
  }
}
