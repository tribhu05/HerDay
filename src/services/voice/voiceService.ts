import type { VoiceProvider, TranscriptResult } from './voiceTypes';
import { ElevenLabsProvider } from './elevenLabsProvider';

export class VoiceService {
  private provider: VoiceProvider;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;

  constructor(provider?: VoiceProvider) {
    this.provider = provider || new ElevenLabsProvider();
  }

  getProvider(): VoiceProvider {
    return this.provider;
  }

  setProvider(provider: VoiceProvider) {
    this.provider = provider;
  }

  /**
   * Checks if audio recording is supported by current browser environment.
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' &&
      Boolean(window.navigator?.mediaDevices?.getUserMedia) &&
      typeof window.MediaRecorder !== 'undefined';
  }

  /**
   * Selects the best supported audio MIME type for recording.
   */
  private getSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    const candidateTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const type of candidateTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  /**
   * Requests microphone access and begins recording audio chunks.
   */
  async startRecording(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Voice recording is not supported in this browser. Please use Chrome, Edge, Firefox, or Safari.');
    }

    // Clean up any lingering recordings
    this.cancelRecording();
    this.audioChunks = [];

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: unknown) {
      const errorName = err instanceof Error ? err.name : '';
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        throw new Error('No microphone device found on your system.');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        throw new Error('Microphone is currently unavailable or used by another application.');
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Microphone access failed: ${msg}`);
    }

    const mimeType = this.getSupportedMimeType();
    const options = mimeType ? { mimeType } : undefined;

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
    } catch {
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
    }

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Request chunk every 250ms for reliable capture
    this.mediaRecorder.start(250);
  }

  /**
   * Stops recording, releases the microphone track immediately, and returns the audio Blob.
   */
  async stopRecording(): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanUpStream();
        reject(new Error('No active recording found to stop.'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          this.cleanUpStream();
          this.audioChunks = [];
          this.mediaRecorder = null;
          resolve(audioBlob);
        } catch (err) {
          this.cleanUpStream();
          reject(err);
        }
      };

      this.mediaRecorder.onerror = (event: Event) => {
        this.cleanUpStream();
        this.mediaRecorder = null;
        reject(new Error(`Recording error: ${event.type}`));
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        this.cleanUpStream();
        reject(err);
      }
    });
  }

  /**
   * Cancels current recording immediately without returning data.
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.cleanUpStream();
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Releases all audio tracks so the browser recording indicator turns off.
   */
  private cleanUpStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }
  }

  /**
   * Helper that records audio and passes it to the provider for transcription.
   */
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptResult> {
    return this.provider.transcribe(audioBlob);
  }
}
