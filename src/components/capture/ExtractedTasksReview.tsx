import React, { useState } from 'react';
import type { ExtractedTask, ExtractionResult } from '../../types/ai';
import type { Priority } from '../../types/task';
import { Plus, Trash2, Check, ArrowLeft, ShieldAlert } from 'lucide-react';


interface ExtractedTasksReviewProps {
  result: ExtractionResult;
  onConfirm: (tasks: ExtractedTask[], generatePlanImmediately: boolean) => void;
  onCancel: () => void;
}

export const ExtractedTasksReview: React.FC<ExtractedTasksReviewProps> = ({
  result,
  onConfirm,
  onCancel,
}) => {
  const [tasks, setTasks] = useState<ExtractedTask[]>(result.extractedTasks);

  const handleUpdateTask = (id: string, updates: Partial<ExtractedTask>) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const handleRemoveTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleAddNewTask = () => {
    const newTask: ExtractedTask = {
      id: `task-manual-${Date.now()}`,
      title: 'New Task',
      priority: 'medium',
      estimatedMinutes: 45,
      deadline: 'Today',
      targetDay: 'today',
    };
    setTasks(prev => [...prev, newTask]);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header & Provider Transparency */}
      <div className="pb-4 border-b border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="flex items-center space-x-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Back to command input</span>
          </button>

          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${
              result.isFallback
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                : result.isDeterministicFallback
                ? 'bg-neutral-900 border-neutral-800 text-neutral-400'
                : 'bg-indigo-950/50 border-indigo-800/60 text-indigo-300'
            }`}
          >
            {result.isFallback
              ? 'Local Heuristic Engine (Fallback)'
              : result.providerName}
          </span>
        </div>

        {/* Fallback Notice Banner */}
        {result.isFallback && (
          <div className="p-3.5 rounded-xl bg-amber-950/25 border border-amber-800/40 text-xs text-amber-200/90 space-y-1">
            <div className="font-semibold flex items-center space-x-1.5 text-amber-300">
              <ShieldAlert size={14} />
              <span>Using Local Heuristic Engine</span>
            </div>
            <p className="text-[11px] text-amber-300/70">
              Gemma model was unavailable or returned an invalid response. HerDay fell back to deterministic heuristic parsing so your workflow continues uninterrupted.
            </p>
            {result.fallbackReason && (
              <p className="text-[10px] font-mono text-amber-400/60 truncate pt-0.5">
                Reason: {result.fallbackReason}
              </p>
            )}
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Tasks HerDay Understood
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Review, adjust durations or deadlines, and confirm before HerDay schedules your day.
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-400">
          <ShieldAlert size={28} className="mx-auto text-neutral-500 mb-2" />
          <p className="text-sm">No tasks identified.</p>
          <button
            onClick={handleAddNewTask}
            className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
          >
            Add a task manually
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-xl bg-[#14161d] border border-neutral-800/80 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <input
                  type="text"
                  value={task.title}
                  onChange={e => handleUpdateTask(task.id, { title: e.target.value })}
                  placeholder="Task title"
                  className="w-full text-sm font-semibold bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-neutral-500 focus:outline-none text-neutral-100 py-0.5"
                />

                <button
                  onClick={() => handleRemoveTask(task.id)}
                  className="text-neutral-500 hover:text-red-400 p-1 rounded transition-colors shrink-0"
                  title="Remove task"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Attributes row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* Priority */}
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-neutral-500 mb-1">
                    Priority
                  </label>
                  <select
                    value={task.priority}
                    onChange={e => handleUpdateTask(task.id, { priority: e.target.value as Priority })}
                    className="w-full px-2 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-neutral-500 mb-1">
                    Effort (mins)
                  </label>
                  <input
                    type="number"
                    step="15"
                    min="15"
                    value={task.estimatedMinutes}
                    onChange={e =>
                      handleUpdateTask(task.id, { estimatedMinutes: Math.max(15, parseInt(e.target.value, 10) || 15) })
                    }
                    className="w-full px-2 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600"
                  />
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-neutral-500 mb-1">
                    Deadline
                  </label>
                  <input
                    type="text"
                    value={task.deadline || ''}
                    onChange={e => handleUpdateTask(task.id, { deadline: e.target.value || null })}
                    placeholder="e.g. Friday"
                    className="w-full px-2 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600"
                  />
                </div>

                {/* Fixed time constraint */}
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-neutral-500 mb-1">
                    Fixed Time
                  </label>
                  <input
                    type="text"
                    value={task.fixedStartTime || ''}
                    onChange={e => handleUpdateTask(task.id, { fixedStartTime: e.target.value || null })}
                    placeholder="e.g. 10:00"
                    className="w-full px-2 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddNewTask}
            className="w-full py-2.5 rounded-lg border border-dashed border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Plus size={13} />
            <span>Add another task</span>
          </button>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-neutral-500">
          {tasks.length} task{tasks.length === 1 ? '' : 's'} ready to incorporate.
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => onConfirm(tasks, false)}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-medium rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
          >
            Add to backlog only
          </button>

          <button
            onClick={() => onConfirm(tasks, true)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-colors shadow-sm"
          >
            <Check size={14} />
            <span>Confirm & Plan My Day</span>
          </button>
        </div>
      </div>
    </div>
  );
};
