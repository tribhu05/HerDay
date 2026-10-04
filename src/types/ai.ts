import type { Priority } from './task';


export interface ExtractedTask {
  id: string; // generated temporary client ID
  title: string;
  description?: string;
  deadline?: string | null;
  priority: Priority;
  estimatedMinutes: number;
  fixedStartTime?: string | null; // e.g. "10:00" if user says "class tomorrow at 10"
  targetDay?: 'today' | 'tomorrow' | 'upcoming' | string; // e.g. "Friday"
  category?: string;
  notes?: string;
}

export interface ExtractionResult {
  providerName: string;
  isDeterministicFallback: boolean;
  isFallback?: boolean;
  fallbackReason?: string;
  modelUsed?: string;
  extractedTasks: ExtractedTask[];
  rawSummary?: string;
  warnings?: string[];
}

export interface AIProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  extractTasks(inputText: string, contextDate: Date): Promise<ExtractionResult>;
}
