import React, { useState } from 'react';
import { PlannerProvider } from './context/PlannerContext';
import { Header } from './components/layout/Header';
import type { NavTab } from './components/layout/Header';

import { TodayView } from './components/today/TodayView';
import { TellHerDayView } from './components/capture/TellHerDayView';
import { TasksView } from './components/tasks/TasksView';
import { SettingsView } from './components/settings/SettingsView';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('today');

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#ededed] flex flex-col font-sans selection:bg-neutral-800 selection:text-white">
      {/* Top Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'today' && (
          <TodayView onNavigateToTell={() => setActiveTab('tell')} />
        )}
        {activeTab === 'tell' && (
          <TellHerDayView onPlanConfirmed={() => setActiveTab('today')} />
        )}
        {activeTab === 'tasks' && <TasksView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Minimal Footer Note */}
      <footer className="py-6 border-t border-neutral-900 text-center text-xs text-neutral-600">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>HerDay — Private, adaptive daily planner</span>
          <span className="font-mono text-[11px] text-neutral-600">
            Understand → Plan → Complete → Replan
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <PlannerProvider>
      <MainLayout />
    </PlannerProvider>
  );
}
