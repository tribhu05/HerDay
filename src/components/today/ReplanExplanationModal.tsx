import React from 'react';
import type { ReplanExplanation } from '../../types/plan';
import { Modal } from '../common/Modal';

import { ArrowRight, Calendar, ShieldCheck, Check } from 'lucide-react';

interface ReplanExplanationModalProps {
  explanation: ReplanExplanation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReplanExplanationModal: React.FC<ReplanExplanationModalProps> = ({
  explanation,
  isOpen,
  onClose,
}) => {
  if (!explanation) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Updated"
      subtitle="HerDay's deterministic replanner adapted your remaining day"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Core summary banner */}
        <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-sm font-medium text-neutral-100 leading-relaxed shadow-sm">
          <div className="text-[10px] uppercase font-mono font-semibold text-amber-400 mb-1 tracking-wider">
            Adaptive Replan Result
          </div>
          {explanation.summary}
        </div>

        {/* Changes list */}
        {explanation.movedTasks.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Rescheduled Tasks
            </h5>
            <div className="space-y-2">
              {explanation.movedTasks.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[#14161d] border border-neutral-800/80 text-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-neutral-200 truncate">{item.taskTitle}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">{item.reason}</div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 font-mono text-[11px] text-neutral-400 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                    <span className="line-through text-neutral-500">{item.originalTime}</span>
                    <ArrowRight size={11} className="text-neutral-400" />
                    <span className="text-amber-300 font-semibold">{item.newTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deferred tasks if any */}
        {explanation.deferredTasks.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Moved to Tomorrow
            </h5>
            <div className="space-y-2">
              {explanation.deferredTasks.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-800 text-xs flex items-center space-x-2 text-neutral-300"
                >
                  <Calendar size={13} className="text-neutral-500" />
                  <span className="font-medium">{item.taskTitle}</span>
                  <span className="text-neutral-500 text-[11px]">({item.reason})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes & Deadlines preserved */}
        {explanation.notes.length > 0 && (
          <div className="pt-2 border-t border-neutral-800/80">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5 flex items-center space-x-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Deadlines Protected</span>
            </h5>
            <ul className="space-y-1">
              {explanation.notes.map((note, idx) => (
                <li key={idx} className="text-xs text-neutral-400 flex items-start space-x-1.5">
                  <span className="text-emerald-500/80 mt-0.5">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-200 text-neutral-950 hover:bg-white transition-colors"
          >
            <Check size={13} />
            <span>Got it, back to my plan</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
