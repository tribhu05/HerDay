import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ReplanBannerProps {
  onReplan: () => void;
  reasonText?: string;
}

export const ReplanBanner: React.FC<ReplanBannerProps> = ({
  onReplan,
  reasonText = 'Your plan needs an adjustment.',
}) => {
  return (
    <div className="my-4 p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 flex items-center justify-between gap-4">
      <div className="flex items-center space-x-3 min-w-0">
        <div className="p-2 rounded-lg bg-amber-900/40 text-amber-300 shrink-0">
          <AlertCircle size={18} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-amber-200">
            {reasonText}
          </h4>
          <p className="text-xs text-amber-300/70 mt-0.5">
            Tasks took longer or were delayed. Let HerDay adapt the rest of your day.
          </p>
        </div>
      </div>

      <button
        onClick={onReplan}
        className="shrink-0 flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm"
      >
        <RefreshCw size={13} />
        <span>Replan my day</span>
      </button>
    </div>
  );
};
