import type { AIProvider, ExtractionResult } from '../../types/ai';
import type { GemmaConfig } from '../../types/preferences';
import { GemmaValidator } from './gemmaValidator';

export type GemmaConnectionState = 'Connected' | 'Not configured' | 'Unreachable' | 'Invalid response';

export interface GemmaConnectionCheckResult {
  state: GemmaConnectionState;
  details: string;
  availableModels?: string[];
}

/**
 * GemmaProvider
 * Integrates directly with real open-weight Gemma models (e.g. via local Ollama or vLLM).
 * Real inference only. Zero fake responses.
 */
export class GemmaProvider implements AIProvider {
  id = 'gemma';
  name = 'Gemma Open-Weight Model';
  private config: GemmaConfig;

  constructor(config: GemmaConfig) {
    this.config = config;
  }

  updateConfig(config: GemmaConfig) {
    this.config = config;
  }

  getConfig(): GemmaConfig {
    return this.config;
  }

  async isAvailable(): Promise<boolean> {
    const res = await this.checkConnectionStatus();
    return res.state === 'Connected';
  }

  /**
   * Diagnostic check to verify whether Ollama/vLLM is reachable and if Gemma is available.
   */
  async checkConnectionStatus(): Promise<GemmaConnectionCheckResult> {
    const rawUrl = (this.config.endpointUrl || '').trim();
    if (!rawUrl) {
      return {
        state: 'Not configured',
        details: 'Gemma endpoint URL is not configured.',
      };
    }

    const base = rawUrl.replace(/\/v1\/?$/, '').replace(/\/api\/?$/, '').replace(/\/$/, '');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Attempt 1: Check native Ollama /api/tags
      let response = await fetch(`${base}/api/tags`, {
        signal: controller.signal,
      }).catch(() => null);

      // Attempt 2: If /api/tags failed, try OpenAI-compatible /v1/models
      if (!response || !response.ok) {
        response = await fetch(`${base}/v1/models`, {
          signal: controller.signal,
          headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {},
        }).catch(() => null);
      }

      clearTimeout(timeoutId);

      if (!response) {
        return {
          state: 'Unreachable',
          details: `Endpoint at ${base} is unreachable. Ensure Ollama or your inference server is running.`,
        };
      }

      if (!response.ok) {
        return {
          state: 'Invalid response',
          details: `Endpoint responded with HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json().catch(() => null);
      if (!data) {
        return {
          state: 'Invalid response',
          details: 'Endpoint returned a non-JSON response.',
        };
      }

      // Extract model names if available
      const models: string[] = [];
      if (Array.isArray(data.models)) {
        // Ollama format
        data.models.forEach((m: { name?: string }) => {
          if (m?.name) models.push(m.name);
        });
      } else if (Array.isArray(data.data)) {
        // OpenAI-compatible format
        data.data.forEach((m: { id?: string }) => {
          if (m?.id) models.push(m.id);
        });
      }

      const requestedModel = this.config.modelName || 'gemma2';
      const hasModel = models.some(m => m.toLowerCase().includes(requestedModel.toLowerCase().split(':')[0]));

      return {
        state: 'Connected',
        details: hasModel
          ? `Connected to Ollama with model "${requestedModel}" ready.`
          : `Connected to endpoint. Available models: ${models.slice(0, 4).join(', ') || 'none listed'}.`,
        availableModels: models,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        state: 'Unreachable',
        details: `Connection failed: ${msg}. Check if Ollama is running and CORS is permitted.`,
      };
    }
  }

  /**
   * Performs real structured extraction with Gemma.
   * Enforces JSON output and validates through GemmaValidator.
   */
  async extractTasks(inputText: string, _contextDate: Date): Promise<ExtractionResult> {
    const rawUrl = (this.config.endpointUrl || '').trim();
    if (!rawUrl) {
      throw new Error('Gemma endpoint URL is not configured. Specify your endpoint in Settings.');
    }

    const base = rawUrl.replace(/\/v1\/?$/, '').replace(/\/api\/?$/, '').replace(/\/$/, '');
    const model = this.config.modelName || 'gemma2';

    const systemPrompt = `You are HerDay's task extraction engine. 
Analyze the user's natural language input and extract individual actionable tasks.
Break down distinct activities, classes, lectures, study chapters, exams, and assignments into SEPARATE task items in the array. Never combine multiple activities into one item.
DO NOT schedule exact calendar hours. DO NOT output conversational text.
Output ONLY a JSON array of tasks matching this schema:
[
  {
    "title": "Concise task name (required)",
    "deadline": "Day or time string if mentioned (e.g. 'Friday', 'Thursday', 'Tomorrow') or null",
    "fixedTime": "HH:mm 24-hr format if event has a rigid start time (e.g. '10:00' for class at 10) or null",
    "estimatedMinutes": 60,
    "priority": "urgent | high | medium | low",
    "category": "Academic | Work | Personal | Health",
    "notes": "Short description or context"
  }
]`;

    let rawContent = '';

    // First try: Ollama native /api/chat with format: "json"
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout for local LLM CPU inference

      const ollamaChatUrl = `${base}/api/chat`;
      const ollamaRes = await fetch(ollamaChatUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: inputText },
          ],
          format: 'json',
          stream: false,
          options: {
            temperature: 0.1,
          },
        }),
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (ollamaRes && ollamaRes.ok) {
        const data = await ollamaRes.json();
        rawContent = data?.message?.content || '';
      }
    } catch {
      // Fall through to /v1/chat/completions fallback
    }

    // Second try: OpenAI-compatible /v1/chat/completions (vLLM or Ollama OpenAI proxy)
    if (!rawContent) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        const v1Url = rawUrl.endsWith('/chat/completions')
          ? rawUrl
          : `${base}/v1/chat/completions`;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        const res = await fetch(v1Url, {
          method: 'POST',
          signal: controller.signal,
          headers,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: inputText },
            ],
            temperature: 0.1,
          }),
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        rawContent = data?.choices?.[0]?.message?.content || '';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to contact Gemma inference endpoint at ${base}: ${msg}`);
      }
    }

    if (!rawContent) {
      throw new Error(`No response content generated by Gemma model "${model}".`);
    }

    // Validate structured output
    const validatedTasks = GemmaValidator.parseAndValidate(rawContent);

    return {
      providerName: `Gemma Open-Weight Model (${model})`,
      isDeterministicFallback: false,
      isFallback: false,
      modelUsed: model,
      extractedTasks: validatedTasks,
      rawSummary: `Parsed ${validatedTasks.length} task${validatedTasks.length === 1 ? '' : 's'} using local open-weight Gemma model.`,
    };
  }
}
