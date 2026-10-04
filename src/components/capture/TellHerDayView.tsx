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
  {
    category: "Exam & Prep",
    text: "Finish my ML assignment tomorrow, study chapters 3 and 4 tonight, and I have class tomorrow at 10.",
  },
  {
    category: "Fixed Commitments",
    text: "I have class at 10 and a meeting at 4, need to finish slides before then and take a 20m break.",
  },
  {
    category: "Reschedule / Delay",
    text: "I missed my 2pm assignment, move things around and protect my evening study session.",
  },
  {
    category: "Coursework Rush",
    text: "I have my DBMS exam Friday, need to finish two chapters, and submit problem set 4 Thursday.",
  },
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
  const [voiceSuccessNotice, setVoiceSuccessNotice] = useState<boolean>(false);
  const voiceServiceRef = useRef<VoiceService | null>(null);

  useEffect(() => {
    voiceServiceRef.current = new VoiceService();
    return () => {
      voiceServiceRef.current?.cancelRecording();
    };
  }, []);

  const handleStartRecording = async () => {
    setVoiceError(null);
    setVoiceSuccessNotice(false);
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
        setVoiceSuccessNotice(true);
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
    setVoiceSuccessNotice(false);
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
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      {/* Intro & Architectural Boundary */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
            <Cpu size={12} className="text-neutral-400" />
            <span className="font-medium">
              {preferences.activeAIProvider === 'heuristic'
                ? 'Local Heuristic Engine (Offline / Deterministic)'
                : 'Local Gemma 2B (On-Device Inference)'}
            </span>
          </div>

          <span className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-900/60 border border-neutral-800/60 text-neutral-400 font-mono">
            Gemma understands. HerDay decides.
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          What do you need to get done?
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
          Tell HerDay what is on your mind. Speak or write naturally — HerDay extracts commitments, respects your deadlines, and always lets you review before scheduling.
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

      {/* Voice Success Transcription Notice */}
      {voiceSuccessNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 flex items-center justify-between text-xs text-emerald-300">
          <span className="truncate">
            ✓ Transcribed via ElevenLabs Scribe. You can review or edit the text before planning.
          </span>
          <button
            type="button"
            onClick={() => setVoiceSuccessNotice(false)}
            className="text-emerald-400 hover:text-emerald-200 ml-2 text-[11px]"
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
            placeholder="Tell me what's on your mind... e.g. 'Finish ML assignment tomorrow, study chapters 3 and 4 tonight, and class at 10'"
            className="w-full bg-transparent text-sm sm:text-base text-neutral-100 placeholder-neutral-500 resize-none focus:outline-none leading-relaxed"
            autoFocus
            aria-label="Describe tasks and commitments in natural language"
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
                      aria-label="Speak natural thoughts using ElevenLabs Scribe speech-to-text"
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 hover:text-white transition-all active:scale-95 shadow-sm"
                      title="Speak naturally (ElevenLabs Scribe STT)"
                    >
                      <Mic size={13} className="text-rose-400" />
                      <span>Speak</span>
                    </button>
                  )}

                  {voiceState === 'recording' && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        aria-label="Stop recording and transcribe speech"
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
                        aria-label="Cancel voice recording"
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
                      <span>Transcribing audio...</span>
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
      <div className="space-y-3 pt-1">
        <div className="flex items-center space-x-1.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
          <Info size={13} />
          <span>Try an example</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EXAMPLE_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectExample(item.text)}
              className="text-left p-3 rounded-xl bg-neutral-900/40 hover:bg-neutral-900/90 border border-neutral-800/60 hover:border-neutral-700 text-xs text-neutral-300 transition-all flex flex-col justify-between gap-1.5 group"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] uppercase font-semibold text-neutral-500 font-mono tracking-wider">
                  {item.category}
                </span>
                <CornerDownLeft
                  size={12}
                  className="opacity-0 group-hover:opacity-100 text-neutral-400 shrink-0 transition-opacity"
                />
              </div>
              <span className="line-clamp-2 text-neutral-300 text-[11px] leading-relaxed">
                "{item.text}"
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
