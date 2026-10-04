import React, { useState } from 'react';
import type { MissedReason } from '../../types/task';
import type { ScheduledItem } from '../../types/plan';
import { Modal } from '../common/Modal';

import { Clock, ZapOff, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';

interface MissedTaskFeedbackModalProps {
  item: ScheduledItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: MissedReason, notes?: string) => void;
}

const REASONS: Array<{
  id: MissedReason;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  {
    id: 'longer_than_expected',
    label: 'Took longer than expected',
    description: 'HerDay will allocate extra focus time and reschedule downstream tasks.',
    icon: Clock,
  },
  {
    id: 'unexpected_came_up',
    label: 'Something unexpected came up',
    description: 'HerDay will clear the disruption and shift this to the next calm window.',
    icon: Sparkles,
  },
  {
    id: 'not_productive',
    label: "I wasn't feeling productive",
    description: 'HerDay will inject a short recovery breather before resuming.',
    icon: ZapOff,
  },
  {
    id: 'not_important',
    label: "It wasn't important anymore",
    description: 'HerDay will remove it cleanly without unnecessarily shuffling other plans.',
    icon: HelpCircle,
  },
  {
    id: 'other',
    label: 'Other',
    description: 'HerDay will smoothly fit this into an open slot.',
    icon: ArrowRight,
  },
];

export const MissedTaskFeedbackModal: React.FC<MissedTaskFeedbackModalProps> = ({
  item,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedReason, setSelectedReason] = useState<MissedReason>('longer_than_expected');
  const [customNotes, setCustomNotes] = useState('');

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedReason, customNotes.trim() || undefined);
    setCustomNotes('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Why wasn't this completed?"
      subtitle={`Adapting schedule for: "${item.title}"`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-neutral-400">
          HerDay learns how your day flows and uses this reason to make realistic, calm adjustments.
        </p>

        <div className="space-y-2">
          {REASONS.map(r => {
            const Icon = r.icon;
            const isSelected = selectedReason === r.id;

            return (
              <label
                key={r.id}
                onClick={() => setSelectedReason(r.id)}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-neutral-800/90 border-neutral-600 text-neutral-100 ring-1 ring-neutral-500/30'
                    : 'bg-neutral-900/50 border-neutral-800/80 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-md ${
                    isSelected ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{r.label}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">{r.description}</div>
                </div>
              </label>
            );
          })}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Additional notes (optional)
          </label>
          <input
            type="text"
            value={customNotes}
            onChange={e => setCustomNotes(e.target.value)}
            placeholder="e.g. Stuck on theorem proof / urgent call from mentor"
            className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
          />
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-colors"
          >
            Replan my day
          </button>
        </div>
      </form>
    </Modal>
  );
};
