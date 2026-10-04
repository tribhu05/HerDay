import React, { useState } from 'react';
import { usePlanner } from '../../context/PlannerContext';
import type { UserPreferences } from '../../types/preferences';
import { Cpu, RotateCcw, Check, Clock, Coffee, Globe, Mic, Database } from 'lucide-react';
import type { GemmaConnectionCheckResult } from '../../services/ai/gemmaProvider';
import type { VoiceStatusResponse } from '../../services/voice/voiceTypes';
import type { MongoDbStatus } from '../../services/storage/cloudStorageService';

export const SettingsView: React.FC = () => {
  const {
    preferences,
    updatePreferences,
    resetAllData,
    checkGemmaConnection,
    checkVoiceConnection,
    dbStatus,
    checkDbStatus,
    migrateLocalDataToCloud,
  } = usePlanner();

  const [formData, setFormData] = useState<UserPreferences>(preferences);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<GemmaConnectionCheckResult | null>(null);
  const [testingVoice, setTestingVoice] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceStatusResponse | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferences(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestGemma = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      // First save current form data so test uses latest inputs
      updatePreferences(formData);
      const res = await checkGemmaConnection();
      setConnectionResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConnectionResult({
        state: 'Unreachable',
        details: `Connection check threw an error: ${msg}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestVoice = async () => {
    setTestingVoice(true);
    setVoiceResult(null);
    try {
      const res = await checkVoiceConnection();
      setVoiceResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setVoiceResult({
        configured: false,
        status: 'Error',
        model: 'scribe_v2',
        details: `Connection check failed: ${msg}`,
      });
    } finally {
      setTestingVoice(false);
    }
  };

  const [testingDb, setTestingDb] = useState(false);
  const [dbResult, setDbResult] = useState<MongoDbStatus | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);

  const handleTestDb = async () => {
    setTestingDb(true);
    setDbResult(null);
    try {
      const res = await checkDbStatus();
      setDbResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDbResult({
        configured: false,
        status: 'Offline',
        details: `Connection check failed: ${msg}`,
      });
    } finally {
      setTestingDb(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrationMessage(null);
    try {
      const res = await migrateLocalDataToCloud();
      setMigrationMessage(res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMigrationMessage(`Migration failed: ${msg}`);
    } finally {
      setMigrating(false);
    }
  };


  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-3 border-b border-neutral-800">
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Customize working hours, break schedules, and AI engine preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Profile */}
        <div className="p-5 rounded-2xl bg-[#14161e] border border-neutral-800 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-neutral-200">
            <span>Personal Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Your Name</label>
              <input
                type="text"
                value={formData.userName}
                onChange={e => setFormData({ ...formData, userName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1 flex items-center space-x-1">
                <Globe size={12} className="text-neutral-500" />
                <span>Timezone</span>
              </label>
              <input
                type="text"
                value={formData.timezone}
                onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>
        </div>

        {/* Working Hours & Breaks */}
        <div className="p-5 rounded-2xl bg-[#14161e] border border-neutral-800 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-neutral-200">
            <Clock size={16} className="text-neutral-400" />
            <span>Working Hours & Breaks</span>
          </div>

          <p className="text-xs text-neutral-400">
            HerDay uses these boundaries to ensure tasks are placed during active hours and that regular restorative breaks are protected.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Work Start</label>
              <input
                type="time"
                value={formData.workingHours.startTime}
                onChange={e =>
                  setFormData({
                    ...formData,
                    workingHours: { ...formData.workingHours, startTime: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1">Work End</label>
              <input
                type="time"
                value={formData.workingHours.endTime}
                onChange={e =>
                  setFormData({
                    ...formData,
                    workingHours: { ...formData.workingHours, endTime: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1 flex items-center space-x-1">
                <Coffee size={12} className="text-neutral-500" />
                <span>Break Every (mins)</span>
              </label>
              <input
                type="number"
                step="15"
                min="30"
                value={formData.breakPreferences.intervalMinutes}
                onChange={e =>
                  setFormData({
                    ...formData,
                    breakPreferences: {
                      ...formData.breakPreferences,
                      intervalMinutes: parseInt(e.target.value, 10) || 90,
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1">Break Duration (mins)</label>
              <input
                type="number"
                step="5"
                min="5"
                value={formData.breakPreferences.durationMinutes}
                onChange={e =>
                  setFormData({
                    ...formData,
                    breakPreferences: {
                      ...formData.breakPreferences,
                      durationMinutes: parseInt(e.target.value, 10) || 15,
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>
        </div>

        {/* AI Engine & Provider Architecture */}
        <div className="p-5 rounded-2xl bg-[#14161e] border border-neutral-800 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-neutral-200">
            <Cpu size={16} className="text-neutral-400" />
            <span>AI Provider & Extraction Architecture</span>
          </div>

          <div className="space-y-3">
            {/* Option 1: Local Heuristic Engine */}
            <label
              onClick={() => setFormData({ ...formData, activeAIProvider: 'heuristic' })}
              className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                formData.activeAIProvider === 'heuristic'
                  ? 'bg-neutral-800/80 border-neutral-600 ring-1 ring-neutral-500/20'
                  : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-white flex items-center space-x-2">
                    <span>Local Heuristic Engine</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono">
                      Deterministic / Offline
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Deterministic rule-based parser executing entirely in your browser. Extracts deadlines, priorities, and effort without external cloud API dependencies.
                  </p>
                </div>
                <input
                  type="radio"
                  name="aiProvider"
                  checked={formData.activeAIProvider === 'heuristic'}
                  onChange={() => {}}
                  className="mt-1"
                />
              </div>
            </label>

            {/* Option 2: Gemma Open-Weight Model */}
            <label
              onClick={() => setFormData({ ...formData, activeAIProvider: 'gemma' })}
              className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                formData.activeAIProvider === 'gemma'
                  ? 'bg-neutral-800/80 border-neutral-600 ring-1 ring-neutral-500/20'
                  : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-white flex items-center space-x-2">
                    <span>Gemma Open-Weight Model</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono">
                      Primary Target
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Connect an inference endpoint running an open-weight Gemma model (e.g. via Ollama or vLLM). No fake responses.
                  </p>
                </div>
                <input
                  type="radio"
                  name="aiProvider"
                  checked={formData.activeAIProvider === 'gemma'}
                  onChange={() => {}}
                  className="mt-1"
                />
              </div>

              {formData.activeAIProvider === 'gemma' && (
                <div
                  className="mt-4 pt-4 border-t border-neutral-800 space-y-4"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Privacy Notice */}
                  <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
                    <span className="font-semibold text-neutral-200 block mb-0.5">Privacy Notice:</span>
                    HerDay is designed around private, user-controlled AI. When using a locally hosted Gemma model, your personal notes and schedule can remain on your own machine instead of being sent to a closed AI service.
                  </div>

                  {/* Endpoint & Model Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-neutral-400 font-medium mb-1">
                        Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={formData.gemmaConfig.endpointUrl}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            gemmaConfig: {
                              ...formData.gemmaConfig,
                              endpointUrl: e.target.value,
                            },
                          })
                        }
                        placeholder="http://localhost:11434"
                        className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600 font-mono"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        Default Ollama: <code className="text-neutral-400">http://localhost:11434</code>
                      </span>
                    </div>

                    <div>
                      <label className="block text-neutral-400 font-medium mb-1">
                        Model Name
                      </label>
                      <input
                        type="text"
                        value={formData.gemmaConfig.modelName}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            gemmaConfig: {
                              ...formData.gemmaConfig,
                              modelName: e.target.value,
                            },
                          })
                        }
                        placeholder="gemma2:2b"
                        className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600 font-mono"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        e.g. <code className="text-neutral-400">gemma2:2b</code>, <code className="text-neutral-400">gemma2:9b</code>
                      </span>
                    </div>
                  </div>

                  {/* Optional API key for authenticated endpoints */}
                  <div className="text-xs">
                    <label className="block text-neutral-400 font-medium mb-1">
                      API Key (optional)
                    </label>
                    <input
                      type="password"
                      value={formData.gemmaConfig.apiKey || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          gemmaConfig: {
                            ...formData.gemmaConfig,
                            apiKey: e.target.value,
                          },
                        })
                      }
                      placeholder="Leave blank for local Ollama / unauthenticated servers"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600 font-mono"
                    />
                  </div>

                  {/* Connection Test & Discrete Status */}
                  <div className="pt-2 border-t border-neutral-800/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleTestGemma}
                        disabled={testingConnection}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 transition-colors"
                      >
                        {testingConnection ? 'Testing Connection...' : 'Test Connection'}
                      </button>

                      {connectionResult && (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                            connectionResult.state === 'Connected'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70'
                              : connectionResult.state === 'Not configured'
                              ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                              : connectionResult.state === 'Unreachable'
                              ? 'bg-red-950/70 text-red-300 border-red-800/70'
                              : 'bg-amber-950/70 text-amber-300 border-amber-800/70'
                          }`}
                        >
                          Status: {connectionResult.state}
                        </span>
                      )}
                    </div>

                    {connectionResult?.details && (
                      <p className="text-[11px] text-neutral-400 bg-neutral-900/40 p-2 rounded border border-neutral-800/60 leading-relaxed">
                        {connectionResult.details}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Voice Input Section */}
        <div className="p-5 rounded-2xl bg-[#14161e] border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-neutral-200">
              <Mic size={16} className="text-neutral-400" />
              <span>Voice Input</span>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer text-xs text-neutral-400">
              <span>Enable Voice Input</span>
              <input
                type="checkbox"
                checked={formData.voiceConfig?.enabled !== false}
                onChange={e =>
                  setFormData({
                    ...formData,
                    voiceConfig: {
                      ...formData.voiceConfig,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-neutral-100 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </label>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-3 text-xs">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white flex items-center space-x-2">
                  <span>ElevenLabs Scribe</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                    Model: {formData.voiceConfig?.model || 'scribe_v2'}
                  </span>
                </div>
                <p className="text-neutral-400 mt-1">
                  Speech-to-text engine converting natural spoken thoughts into editable transcripts.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestVoice}
                disabled={testingVoice}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors shrink-0"
              >
                {testingVoice ? 'Checking...' : 'Check Status'}
              </button>
            </div>

            {voiceResult && (
              <div className="pt-2 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span
                  className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                    voiceResult.status === 'Connected'
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70'
                      : voiceResult.status === 'Not configured'
                      ? 'bg-amber-950/70 text-amber-300 border-amber-800/70'
                      : 'bg-red-950/70 text-red-300 border-red-800/70'
                  }`}
                >
                  Status: {voiceResult.status}
                </span>
                {voiceResult.details && (
                  <span className="text-[11px] text-neutral-400">{voiceResult.details}</span>
                )}
              </div>
            )}

            {/* Privacy Architecture Notice */}
            <div className="pt-3 border-t border-neutral-800/60 text-[11px] text-neutral-400 space-y-1.5 leading-relaxed">
              <p className="text-neutral-300 font-medium">Privacy Architecture:</p>
              <p>
                Voice input is transcribed by ElevenLabs before the transcript is passed to HerDay's local Gemma model.
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-neutral-400">
                <li><span className="text-neutral-300 font-medium">Voice audio</span> → ElevenLabs (transcription only)</li>
                <li><span className="text-neutral-300 font-medium">Transcript</span> → local Gemma (open-weight task understanding)</li>
                <li><span className="text-neutral-300 font-medium">Scheduling</span> → HerDay application code (deterministic rules)</li>
              </ul>
              <p className="text-[10px] text-neutral-500 pt-0.5">
                Configure <code className="text-neutral-300 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">ELEVENLABS_API_KEY</code> in <code className="text-neutral-300 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">.env</code>. Credentials remain strictly server-side and are never exposed in browser bundles.
              </p>
            </div>
          </div>
        </div>

        {/* Database & Cloud Persistence Section */}
        <div className="p-5 rounded-2xl bg-[#14161e] border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-neutral-200">
              <Database size={16} className="text-neutral-400" />
              <span>Database</span>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">Local-first architecture</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-3 text-xs">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white flex items-center space-x-2">
                  <span>MongoDB Atlas</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    Collections: tasks, plans, replanning_events, preferences
                  </span>
                </div>
                <p className="text-neutral-400 mt-1">
                  Optional cloud storage for cross-session task persistence, plan records, and adaptive replanning history.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTestDb}
                  disabled={testingDb}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
                >
                  {testingDb ? 'Checking...' : 'Check Status'}
                </button>
              </div>
            </div>

            {/* Status Indicator */}
            {(() => {
              const currentStatus = dbResult || dbStatus;
              return (
                <div className="pt-2 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                      currentStatus.status === 'Connected'
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70'
                        : currentStatus.status === 'Not configured'
                        ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                        : 'bg-amber-950/70 text-amber-300 border-amber-800/70'
                    }`}
                  >
                    Status: {currentStatus.status}
                  </span>
                  {currentStatus.details && (
                    <span className="text-[11px] text-neutral-400">{currentStatus.details}</span>
                  )}
                </div>
              );
            })()}

            {/* Intentional Data Migration Path */}
            <div className="pt-3 border-t border-neutral-800/60 flex items-center justify-between gap-2">
              <div>
                <span className="text-neutral-300 font-medium block">Local-to-Cloud Migration</span>
                <span className="text-[11px] text-neutral-400">
                  Sync existing localStorage tasks and active plan into MongoDB Atlas.
                </span>
              </div>
              <button
                type="button"
                onClick={handleMigrate}
                disabled={migrating || (dbResult || dbStatus).status !== 'Connected'}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors shrink-0"
              >
                {migrating ? 'Migrating...' : 'Migrate to MongoDB'}
              </button>
            </div>

            {migrationMessage && (
              <p className="text-[11px] text-emerald-400 bg-emerald-950/30 p-2 rounded border border-emerald-900/50">
                {migrationMessage}
              </p>
            )}

            {/* Privacy & Security Callout */}
            <div className="pt-3 border-t border-neutral-800/60 text-[11px] text-neutral-400 space-y-1.5 leading-relaxed">
              <p className="text-neutral-300 font-medium">Privacy & Security:</p>
              <p>
                HerDay stores planner data in MongoDB when cloud persistence is enabled. AI scheduling remains controlled by the application, and API credentials are never stored in the database.
              </p>
              <p className="text-[10px] text-neutral-500 pt-0.5">
                Configure <code className="text-neutral-300 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">MONGODB_URI</code> in <code className="text-neutral-300 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">.env</code>. When MongoDB is unavailable or unconfigured, HerDay automatically operates locally with zero interruption.
              </p>
            </div>
          </div>
        </div>

        {/* Save button & Feedback */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-neutral-100 text-neutral-950 hover:bg-white transition-colors shadow-sm"
            >
              <Check size={14} />
              <span>Save Preferences</span>
            </button>

            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center space-x-1">
                <Check size={13} />
                <span>Saved successfully</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all tasks, plans, and preferences back to initial state?')) {
                resetAllData();
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </form>
    </div>
  );
};
