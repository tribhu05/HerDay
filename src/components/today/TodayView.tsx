import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { Sparkles, RefreshCw, CalendarCheck, Clock, Plus } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { TimelineItem } from './TimelineItem';
import { ReplanBanner } from './ReplanBanner';
import { MissedTaskFeedbackModal } from './MissedTaskFeedbackModal';
import { ReplanExplanationModal } from './ReplanExplanationModal';
import type { ScheduledItem } from '../../types/plan';



interface TodayViewProps {
  onNavigateToTell: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ onNavigateToTell }) => {
  const {
    activePlan,
    preferences,
    replanNeeded,
    activeMissedItem,
    latestReplanExplanation,
    toggleCompleteScheduledItem,
    openMissedFeedback,
    closeMissedFeedback,
    submitMissedFeedbackAndReplan,
    triggerManualReplan,
    dismissReplanExplanation,
    loadFriendScenario,
    clearAllTasks,
  } = usePlanner();

  // Dynamic greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = preferences.userName ? `, ${preferences.userName}` : '';
    if (hour < 12) return `Good morning${name}.`;
    if (hour < 17) return `Good afternoon${name}.`;
    return `Good evening${name}.`;
  }, [preferences.userName]);

  const todayFormatted = format(new Date(), 'EEEE, MMMM d');

  // Calculate task completion progress (excluding breaks)
  const taskItems = useMemo(() => {
    return activePlan.items.filter(item => item.type === 'task');
  }, [activePlan.items]);

  const completedCount = useMemo(() => {
    return taskItems.filter(item => item.status === 'completed').length;
  }, [taskItems]);

  const progressPercent = taskItems.length > 0 
    ? Math.round((completedCount / taskItems.length) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center space-x-2 text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">
            <span>{todayFormatted}</span>
            <span className="text-neutral-700">•</span>
            <span className="text-neutral-400 capitalize">Deterministic Daily Plan</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {greeting}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {taskItems.length === 0
              ? 'No schedule planned for today yet. Express your thoughts or load a sample scenario.'
              : `${completedCount} of ${taskItems.length} commitments completed (${progressPercent}%). HerDay protects your breaks and deadlines.`}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
          {taskItems.length > 0 ? (
            <button
              onClick={triggerManualReplan}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
              title="Recalculate remaining schedule deterministically"
              aria-label="Replan day"
            >
              <RefreshCw size={13} className="text-neutral-400" />
              <span>Replan day</span>
            </button>
          ) : (
            <button
              onClick={loadFriendScenario}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
              title="Load the real student exam week sample scenario"
              aria-label="Load Exam Week Scenario"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>Load Friend Scenario</span>
            </button>
          )}

          <button
            onClick={onNavigateToTell}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-colors shadow-sm"
            aria-label="Tell HerDay what to plan"
          >
            <Sparkles size={13} />
            <span>Tell HerDay</span>
          </button>
        </div>
      </div>

      {/* Progress line */}
      {taskItems.length > 0 && (
        <div className="w-full bg-neutral-900 rounded-full h-1 overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="bg-emerald-500 h-1 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Replan notice if a task is overdue or missed */}
      {replanNeeded && (
        <ReplanBanner
          onReplan={triggerManualReplan}
          reasonText="Your plan needs an adjustment. An earlier commitment ran over."
        />
      )}

      {/* Today's Schedule Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <div className="flex items-center space-x-1.5">
            <Clock size={13} className="text-neutral-500" />
            <span>Today's Schedule</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-normal lowercase tracking-normal text-neutral-500">
            <span>
              working hours {preferences.workingHours.startTime} – {preferences.workingHours.endTime}
            </span>
            {taskItems.length > 0 && (
              <button
                onClick={clearAllTasks}
                className="text-neutral-500 hover:text-neutral-300 transition-colors"
                title="Clear schedule to blank canvas"
              >
                clear
              </button>
            )}
          </div>
        </div>

        {activePlan.items.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-neutral-800 bg-[#121319]/40 space-y-3">
            <CalendarCheck size={32} className="mx-auto text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-200">Nothing scheduled for today</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              HerDay was built for a friend overwhelmed by rigid calendars. Speak or type messy thoughts naturally, and HerDay will turn them into a calm, realistic day.
            </p>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={onNavigateToTell}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-colors shadow-sm"
              >
                <Plus size={13} />
                <span>Tell HerDay</span>
              </button>
              <button
                onClick={loadFriendScenario}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Preview Exam Week Scenario</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-transparent">
            {activePlan.items.map(item => (
              <TimelineItem
                key={item.id}
                item={item}
                onToggleComplete={toggleCompleteScheduledItem}
                onMarkDelayed={(item: ScheduledItem) => openMissedFeedback(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals for feedback & replan explanations */}
      <MissedTaskFeedbackModal
        item={activeMissedItem}
        isOpen={Boolean(activeMissedItem)}
        onClose={closeMissedFeedback}
        onSubmit={submitMissedFeedbackAndReplan}
      />

      <ReplanExplanationModal
        explanation={latestReplanExplanation}
        isOpen={Boolean(latestReplanExplanation)}
        onClose={dismissReplanExplanation}
      />
    </div>
  );
};
