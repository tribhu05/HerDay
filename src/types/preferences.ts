export type AIProviderId = 'heuristic' | 'gemma';

export interface GemmaConfig {
  endpointUrl: string; // e.g., "http://localhost:11434/api/generate" or custom vLLM / OpenAI-compatible endpoint
  apiKey?: string;
  modelName: string;   // e.g., "gemma2:9b" or "gemma-2-2b-it"
}

export interface VoiceConfig {
  enabled: boolean;
  model: string;
}

export interface UserPreferences {
  userName: string;
  workingHours: {
    startTime: string; // "09:00"
    endTime: string;   // "21:30"
  };
  breakPreferences: {
    intervalMinutes: number; // e.g. 90 mins between breaks
    durationMinutes: number; // e.g. 15 mins break
  };
  timezone: string;
  activeAIProvider: AIProviderId;
  gemmaConfig: GemmaConfig;
  voiceConfig: VoiceConfig;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  userName: 'Maya',
  workingHours: {
    startTime: '09:00',
    endTime: '21:30',
  },
  breakPreferences: {
    intervalMinutes: 90,
    durationMinutes: 15,
  },
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  activeAIProvider: 'gemma',
  gemmaConfig: {
    endpointUrl: 'http://localhost:11434',
    apiKey: '',
    modelName: 'gemma2:2b',
  },
  voiceConfig: {
    enabled: true,
    model: 'scribe_v2',
  },
};
