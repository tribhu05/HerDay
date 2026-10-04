import type { VoiceProvider, VoiceStatusResponse, TranscriptResult } from './voiceTypes';

export class ElevenLabsProvider implements VoiceProvider {
  name = 'ElevenLabs Scribe';
  model = 'scribe_v2';
  private proxyBaseUrl: string;

  constructor(proxyBaseUrl = '/api/voice') {
    this.proxyBaseUrl = proxyBaseUrl;
  }

  /**
   * Diagnostic check to see if ElevenLabs is configured server-side.
   */
  async getStatus(): Promise<VoiceStatusResponse> {
    try {
      const response = await fetch(`${this.proxyBaseUrl}/status`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return {
          configured: false,
          status: 'Error',
          model: this.model,
          details: `Voice server responded with HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        configured: Boolean(data.configured),
        status: data.status || (data.configured ? 'Connected' : 'Not configured'),
        model: data.model || this.model,
        details: data.details,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        configured: false,
        status: 'Error',
        model: this.model,
        details: `Failed to connect to local voice proxy: ${msg}`,
      };
    }
  }

  /**
   * Sends audio blob to the secure server proxy for transcription with ElevenLabs Scribe.
   */
  async transcribe(audioBlob: Blob): Promise<TranscriptResult> {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Recorded audio is empty. Please speak clearly into your microphone.');
    }

    const mimeType = audioBlob.type || 'audio/webm';

    let response: Response;
    try {
      response = await fetch(`${this.proxyBaseUrl}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
          'X-Audio-Model': this.model,
        },
        body: audioBlob,
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      throw new Error(`Network failure while sending audio to transcription service: ${msg}`);
    }

    if (!response.ok) {
      let errorMessage = `Transcription request failed with HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.error) {
          errorMessage = errorJson.error;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // Fall back to HTTP status text
        if (response.status === 401) {
          errorMessage = 'ElevenLabs authentication failed. Verify that ELEVENLABS_API_KEY is correctly set in .env.';
        } else if (response.status === 503) {
          errorMessage = 'ElevenLabs API key is not configured. Set ELEVENLABS_API_KEY in .env.';
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const transcriptText = (data.text || '').trim();

    if (!transcriptText) {
      throw new Error('No speech was detected in the audio. Please try speaking again.');
    }

    return {
      text: transcriptText,
      provider: this.name,
      model: data.model || this.model,
      durationSeconds: data.duration,
      languageCode: data.language_code,
    };
  }
}
