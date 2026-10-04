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
    <header className="border-b border-neutral-800/80 bg-[#0e1014]/90 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Date */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onTabChange('today')}
            className="flex items-center space-x-2 text-left group"
          >
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-neutral-200 transition-colors">
              HerDay
            </span>
          </button>

          <span className="hidden sm:inline-block text-neutral-600">/</span>

          <span className="hidden sm:inline-block text-xs font-medium text-neutral-400">
            {todayFormatted}
          </span>
        </div>

        {/* Engine status & Navigation */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          {/* Subtle Engine Indicator */}
          <button
            onClick={() => onTabChange('settings')}
            title={`Active engine: ${
              preferences.activeAIProvider === 'heuristic'
                ? 'Local Heuristic Engine'
                : 'Gemma Open-Weight Model'
            }`}
            className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-300 hover:border-neutral-700 transition-colors"
          >
            <Cpu size={12} className="text-neutral-500" />
            <span className="truncate max-w-[140px]">
              {preferences.activeAIProvider === 'heuristic'
                ? 'Local Heuristic Engine'
                : 'Gemma Model'}
            </span>
          </button>

          {/* Navigation Items */}
          <nav className="flex items-center space-x-1 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800/70">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const showDot = item.id === 'today' && replanNeeded;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    isActive
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-neutral-400'} />
                  <span>{item.label}</span>
                  {showDot && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
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
