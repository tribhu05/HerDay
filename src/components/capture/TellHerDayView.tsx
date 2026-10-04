import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, CornerDownLeft, Cpu, AlertCircle, Info, Mic, X } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { ExtractedTasksReview } from './ExtractedTasksReview';
import type { ExtractedTask } from '../../types/ai';
import { VoiceService } from '../../services/voice/voiceService';
import type { VoiceRecordingState } from '../../services/voice/voiceTypes';

interface TellHerDayViewProps {
  onPlanConfirmed: () => void;
}

const EXAMPLE_PROMPTS = [
  "I have my DBMS exam Friday. I need to finish two chapters and submit my assignment Thursday. I also have class tomorrow at 10.",
  "Need to prepare slides for the sprint review this afternoon at 3pm, review 2 PRs, and do a quick workout.",
  "Finish writing chapter 1 and 2, submit the budget proposal before 5pm, and take a 30m break.",
];

export const TellHerDayView: React.FC<TellHerDayViewProps> = ({ onPlanConfirmed }) => {
  const {
    tellHerDay,
    isExtracting,
    extractionResult,
    clearExtraction,
    confirmExtractedTasks,
    preferences,
    errorNotice,
    clearError,
    updatePreferences,
  } = usePlanner();

  const [inputVal, setInputVal] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceRecordingState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voiceServiceRef = useRef<VoiceService | null>(null);

  useEffect(() => {
    voiceServiceRef.current = new VoiceService();
    return () => {
      voiceServiceRef.current?.cancelRecording();
    };
  }, []);

  const handleStartRecording = async () => {
    setVoiceError(null);
    clearError();
    if (!voiceServiceRef.current) {
      voiceServiceRef.current = new VoiceService();
    }
    try {
      setVoiceState('recording');
      await voiceServiceRef.current.startRecording();
    } catch (err: unknown) {
      setVoiceState('idle');
      const msg = err instanceof Error ? err.message : String(err);
      setVoiceError(msg);
    }
  };

  const handleStopRecording = async () => {
    if (!voiceServiceRef.current) return;
    setVoiceState('processing');
    try {
      const audioBlob = await voiceServiceRef.current.stopRecording();
      const result = await voiceServiceRef.current.transcribeAudio(audioBlob);
      if (result.text) {
        setInputVal(prev => (prev.trim() ? `${prev.trim()} ${result.text}` : result.text));
      }
      setVoiceState('idle');
    } catch (err: unknown) {
      setVoiceState('idle');
      const msg = err instanceof Error ? err.message : String(err);
      setVoiceError(msg);
    }
  };

  const handleCancelRecording = () => {
    voiceServiceRef.current?.cancelRecording();
    setVoiceState('idle');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isExtracting) return;
    try {
      await tellHerDay(inputVal);
    } catch {
      // error is handled in context
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectExample = (promptText: string) => {
    setInputVal(promptText);
    clearError();
  };

  const handleConfirmExtraction = (editedTasks: ExtractedTask[], generatePlanImmediately: boolean) => {
    confirmExtractedTasks(editedTasks, generatePlanImmediately);
    onPlanConfirmed();
  };

  // If extraction result exists, show the review & confirmation screen
  if (extractionResult) {
    return (
      <ExtractedTasksReview
        result={extractionResult}
        onConfirm={handleConfirmExtraction}
        onCancel={clearExtraction}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Intro */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
          <Cpu size={12} className="text-neutral-500" />
          <span>
            {preferences.activeAIProvider === 'heuristic'
              ? 'Local Heuristic Engine (deterministic rule-based)'
              : 'Gemma Open-Weight Provider'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Tell HerDay
        </h1>
        <p className="text-sm text-neutral-400">
          Express what you need to achieve in natural language. HerDay extracts actionable tasks, respects your deadlines, and builds a realistic schedule.
        </p>
      </div>

      {/* Error Banner if external provider fails */}
      {errorNotice && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 space-y-2 text-xs">
          <div className="flex items-start space-x-2 text-red-300 font-medium">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <div className="flex items-center space-x-3 pt-1">
            <button
              onClick={() => {
                updatePreferences({ ...preferences, activeAIProvider: 'heuristic' });
                clearError();
              }}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium"
            >
              Switch to Local Heuristic Engine
            </button>
            <button
              onClick={clearError}
              className="text-neutral-400 hover:text-neutral-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Voice Error Notice */}
      {voiceError && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-start justify-between text-xs text-amber-200">
          <div className="flex items-start space-x-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-400" />
            <span>{voiceError}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="text-amber-400 hover:text-amber-200 text-xs shrink-0 ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Command Input Card */}
      <div className="p-5 rounded-2xl bg-[#14161e] border border-neutral-800/90 shadow-xl focus-within:border-neutral-700 transition-colors">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={inputVal}
            onChange={e => {
              setInputVal(e.target.value);
              if (errorNotice) clearError();
            }}
            onKeyDown={handleKeyDown}
            rows={5}
            placeholder="Tell me what's on your mind... (or use Speak)"
            className="w-full bg-transparent text-sm sm:text-base text-neutral-100 placeholder-neutral-500 resize-none focus:outline-none leading-relaxed"
            autoFocus
          />

          <div className="flex items-center justify-between pt-3 border-t border-neutral-800/70">
            <div className="flex items-center space-x-3">
              {/* Voice Input Button */}
              {preferences.voiceConfig?.enabled !== false && (
                <div className="flex items-center space-x-1.5">
                  {voiceState === 'idle' && (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      disabled={isExtracting}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 hover:text-white transition-all active:scale-95 shadow-sm"
                      title="Speak into microphone"
                    >
                      <Mic size={13} className="text-neutral-400" />
                      <span>Speak</span>
                    </button>
                  )}

                  {voiceState === 'recording' && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 border border-rose-800 text-xs text-rose-200 font-medium transition-all shadow-sm"
                        title="Click to finish speaking"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        <Mic size={13} className="text-rose-300" />
                        <span>Listening...</span>
                        <span className="text-[10px] text-rose-300/90 underline font-normal ml-0.5">Finish</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelRecording}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
                        title="Cancel recording"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {voiceState === 'processing' && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
                      <div className="w-3 h-3 border-2 border-neutral-600 border-t-neutral-300 rounded-full animate-spin" />
                      <span>Transcribing...</span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[11px] text-neutral-500 hidden sm:flex items-center space-x-1">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-mono text-[10px]">
                  Ctrl
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-mono text-[10px]">
                  Enter
                </kbd>
                <span>to plan</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputVal.trim() || isExtracting || voiceState === 'recording'}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                !inputVal.trim() || isExtracting
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-neutral-100 text-neutral-950 hover:bg-white active:scale-[0.98]'
              }`}
            >
              {isExtracting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-neutral-600 border-t-neutral-950 rounded-full animate-spin" />
                  <span>Understanding...</span>
                </>
              ) : (
                <>
                  <span>Plan my day</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Helper / Example Prompts */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center space-x-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
          <Info size={13} />
          <span>Try an example</span>
        </div>

        <div className="space-y-2">
          {EXAMPLE_PROMPTS.map((promptText, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectExample(promptText)}
              className="w-full text-left p-3 rounded-xl bg-neutral-900/40 hover:bg-neutral-900/90 border border-neutral-800/60 hover:border-neutral-700/80 text-xs text-neutral-300 transition-all flex items-start justify-between gap-3 group"
            >
              <span className="line-clamp-2 leading-relaxed">"{promptText}"</span>
              <CornerDownLeft
                size={13}
                className="opacity-0 group-hover:opacity-100 text-neutral-400 shrink-0 mt-0.5 transition-opacity"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
