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
          <div className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">
            {todayFormatted}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {greeting}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {taskItems.length === 0
              ? 'No schedule planned for today yet.'
              : `${completedCount} of ${taskItems.length} tasks completed (${progressPercent}%).`}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={triggerManualReplan}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
            title="Adapt schedule for unexpected changes"
          >
            <RefreshCw size={13} className="text-neutral-400" />
            <span>Replan day</span>
          </button>

          <button
            onClick={onNavigateToTell}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-colors shadow-sm"
          >
            <Sparkles size={13} />
            <span>Tell HerDay</span>
          </button>
        </div>
      </div>

      {/* Progress line */}
      {taskItems.length > 0 && (
        <div className="w-full bg-neutral-900 rounded-full h-1 overflow-hidden">
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
          reasonText="Your plan needs an adjustment."
        />
      )}

      {/* Today's Schedule Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <div className="flex items-center space-x-1.5">
            <Clock size={13} className="text-neutral-500" />
            <span>Today's Schedule</span>
          </div>

          <span className="text-[11px] font-normal lowercase tracking-normal text-neutral-500">
            working hours {preferences.workingHours.startTime} – {preferences.workingHours.endTime}
          </span>
        </div>

        {activePlan.items.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-neutral-800 bg-[#121319]/40">
            <CalendarCheck size={28} className="mx-auto text-neutral-600 mb-3" />
            <h3 className="text-sm font-medium text-neutral-300">Nothing scheduled for today</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-4">
              Speak or write naturally about what you need to get done, and HerDay will assemble a calm timeline.
            </p>
            <button
              onClick={onNavigateToTell}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-colors"
            >
              <Plus size={13} />
              <span>Plan my day</span>
            </button>
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
