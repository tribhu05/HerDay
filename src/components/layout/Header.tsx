import React from 'react';
import { format } from 'date-fns';
import { Calendar, Sparkles, CheckSquare, Settings as SettingsIcon, Cpu } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';

export type NavTab = 'today' | 'tell' | 'tasks' | 'settings';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const { preferences, replanNeeded } = usePlanner();
  const todayFormatted = format(new Date(), 'EEEE, MMMM d');

  const navItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'tell', label: 'Tell HerDay', icon: Sparkles },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="border-b border-neutral-800/80 bg-[#0c0d10]/95 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand, Tagline & Date */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            onClick={() => onTabChange('today')}
            className="flex items-center space-x-2 text-left group shrink-0"
            aria-label="HerDay Home — Today's Schedule"
          >
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-neutral-200 transition-colors">
              HerDay
            </span>
          </button>

          <span className="hidden sm:inline-block text-neutral-700">/</span>

          <div className="hidden sm:flex items-center space-x-2 min-w-0">
            <span className="text-xs text-neutral-400 font-normal truncate">
              {todayFormatted}
            </span>
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-900 border border-neutral-800 text-neutral-400">
              Build for a Friend
            </span>
          </div>
        </div>

        {/* Engine status & Navigation */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {/* Subtle Engine & Privacy Indicator */}
          <button
            onClick={() => onTabChange('settings')}
            title={`Active AI Architecture: ${
              preferences.activeAIProvider === 'heuristic'
                ? 'Local Heuristic Engine (Offline / Deterministic)'
                : 'Local Gemma 2B via Ollama (On-Device Inference)'
            }`}
            aria-label="View AI and Privacy Settings"
            className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition-all shadow-sm"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${preferences.activeAIProvider === 'heuristic' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <Cpu size={12} className="text-neutral-400" />
            <span className="truncate max-w-[130px] font-medium">
              {preferences.activeAIProvider === 'heuristic'
                ? 'Local Heuristic'
                : 'Local Gemma 2B'}
            </span>
          </button>

          {/* Navigation Items */}
          <nav className="flex items-center space-x-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800/80 shadow-sm" aria-label="Main Navigation">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const showDot = item.id === 'today' && replanNeeded;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-neutral-400'} />
                  <span className={item.id === 'tell' ? 'font-semibold' : ''}>{item.label}</span>
                  {showDot && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
