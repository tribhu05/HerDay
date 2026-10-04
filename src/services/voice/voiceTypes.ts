export type VoiceConnectionStatus = 'Connected' | 'Not configured' | 'Error' | 'Checking';

export type VoiceRecordingState = 'idle' | 'recording' | 'processing' | 'error';

export interface TranscriptResult {
  text: string;
  provider: string; // e.g., "ElevenLabs Scribe"
  model?: string;    // e.g., "scribe_v2"
  durationSeconds?: number;
  languageCode?: string;
}

export interface VoiceStatusResponse {
  configured: boolean;
  status: VoiceConnectionStatus;
  model: string;
  details?: string;
}

export interface VoiceProvider {
  name: string;
  model: string;
  getStatus(): Promise<VoiceStatusResponse>;
  transcribe(audioBlob: Blob): Promise<TranscriptResult>;
}
