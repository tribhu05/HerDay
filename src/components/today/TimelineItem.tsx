import React from 'react';
import { Check, Clock, AlertTriangle, Coffee } from 'lucide-react';
import type { ScheduledItem } from '../../types/plan';
import { PriorityBadge } from '../common/Badge';


interface TimelineItemProps {
  item: ScheduledItem;
  onToggleComplete: (itemId: string) => void;
  onMarkDelayed: (item: ScheduledItem) => void;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  item,
  onToggleComplete,
  onMarkDelayed,
}) => {
  const isCompleted = item.status === 'completed';
  const isBreak = item.type === 'break';

  if (isBreak) {
    return (
      <div className="flex items-center space-x-4 py-2 px-3 my-1 rounded-lg bg-neutral-900/40 border border-dashed border-neutral-800/60 text-neutral-400">
        <div className="w-20 text-xs font-mono text-neutral-500 tabular-nums">
          {item.startTime} — {item.endTime}
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <Coffee size={13} className="text-neutral-500" />
          <span>{item.title}</span>
          <span className="text-neutral-600">({item.durationMinutes}m)</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-start space-x-4 p-3.5 my-1.5 rounded-lg border transition-all ${
        isCompleted
          ? 'bg-neutral-900/30 border-neutral-800/40 text-neutral-500'
          : 'bg-[#14161d] border-neutral-800/80 hover:border-neutral-700/80 text-neutral-200'
      }`}
    >
      {/* Time column */}
      <div className="w-24 shrink-0 pt-0.5">
        <div className="text-xs font-mono font-medium text-neutral-400 tabular-nums">
          {item.startTime} — {item.endTime}
        </div>
        <div className="text-[11px] text-neutral-500 mt-0.5">
          {item.durationMinutes} mins
        </div>
      </div>

      {/* Completion toggle button */}
      <button
        onClick={() => onToggleComplete(item.id)}
        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${
          isCompleted
            ? 'bg-emerald-600 border-emerald-500 text-white'
            : 'border-neutral-600 hover:border-neutral-400 bg-neutral-900/60'
        }`}
        title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
      >
        {isCompleted && <Check size={13} strokeWidth={2.5} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h4
            className={`text-sm font-medium leading-snug truncate ${
              isCompleted ? 'line-through text-neutral-500' : 'text-neutral-100'
            }`}
          >
            {item.title}
          </h4>
          
          <div className="flex items-center space-x-2 shrink-0">
            {item.priority && <PriorityBadge priority={item.priority} />}
            {item.isFixedTime && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/60">
                Fixed
              </span>
            )}
          </div>
        </div>

        {/* Sub-info / deadline / actions */}
        <div className="flex items-center justify-between mt-1 text-xs text-neutral-500">
          <div className="flex items-center space-x-3">
            {item.deadlineNotice && (
              <span className="flex items-center space-x-1 text-amber-400/80">
                <Clock size={12} />
                <span>{item.deadlineNotice}</span>
              </span>
            )}
          </div>

          {!isCompleted && (
            <button
              onClick={() => onMarkDelayed(item)}
              className="opacity-0 group-hover:opacity-100 text-[11px] text-neutral-400 hover:text-amber-400 flex items-center space-x-1 transition-opacity px-2 py-0.5 rounded hover:bg-neutral-800/80"
              title="Reschedule or report delay"
            >
              <AlertTriangle size={11} />
              <span>Report delay</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
