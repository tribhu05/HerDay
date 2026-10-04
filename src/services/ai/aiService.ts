import type { AIProvider, ExtractionResult } from '../../types/ai';
import type { UserPreferences } from '../../types/preferences';

import { LocalHeuristicEngine } from './heuristicEngine';
import { GemmaProvider } from './gemmaProvider';

export class AIService {
  private heuristicEngine: LocalHeuristicEngine;
  private gemmaProvider: GemmaProvider;

  constructor(preferences: UserPreferences) {
    this.heuristicEngine = new LocalHeuristicEngine();
    this.gemmaProvider = new GemmaProvider(preferences.gemmaConfig);
  }

  updatePreferences(preferences: UserPreferences) {
    this.gemmaProvider.updateConfig(preferences.gemmaConfig);
  }

  getProvider(providerId: 'heuristic' | 'gemma'): AIProvider {
    if (providerId === 'gemma') {
      return this.gemmaProvider;
    }
    return this.heuristicEngine;
  }

  getGemmaProvider(): GemmaProvider {
    return this.gemmaProvider;
  }

  getHeuristicEngine(): LocalHeuristicEngine {
    return this.heuristicEngine;
  }

  async extractTasks(
    inputText: string,
    preferences: UserPreferences,
    contextDate: Date = new Date()
  ): Promise<ExtractionResult> {
    // If user explicitly configured Local Heuristic Engine, execute it directly
    if (preferences.activeAIProvider === 'heuristic') {
      const res = await this.heuristicEngine.extractTasks(inputText, contextDate);
      return {
        ...res,
        isFallback: false,
      };
    }

    // Otherwise, Gemma is the primary provider
    try {
      const gemmaResult = await this.gemmaProvider.extractTasks(inputText, contextDate);
      return {
        ...gemmaResult,
        isFallback: false,
      };
    } catch (gemmaErr: unknown) {
      // Never silently fall back: capture exact diagnostic reason
      const reason = gemmaErr instanceof Error ? gemmaErr.message : String(gemmaErr);
      
      console.warn(`[HerDay AIService] Gemma inference failed, falling back to Local Heuristic Engine: ${reason}`);

      const fallbackResult = await this.heuristicEngine.extractTasks(inputText, contextDate);

      return {
        ...fallbackResult,
        providerName: 'Local Heuristic Engine',
        isDeterministicFallback: true,
        isFallback: true,
        fallbackReason: reason,
        warnings: [
          `Gemma model was unavailable or returned an invalid response. HerDay fell back to the Local Heuristic Engine.`,
        ],
      };
    }
  }
}
