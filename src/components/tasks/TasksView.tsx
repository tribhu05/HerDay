import React, { useState, useMemo } from 'react';
import { Plus, Check, Clock, Edit2, Search } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import type { Task, TaskStatus } from '../../types/task';
import { PriorityBadge, Badge } from '../common/Badge';

import { TaskEditModal } from './TaskEditModal';

export const TasksView: React.FC = () => {
  const { tasks, updateTask, deleteTask, createTask } = usePlanner();

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (activeFilter === 'pending' && task.status === 'completed') return false;
      if (activeFilter === 'completed' && task.status !== 'completed') return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.deadline?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [tasks, activeFilter, searchQuery]);

  const handleToggleComplete = (task: Task) => {
    const isNowCompleted = task.status !== 'completed';
    updateTask({
      ...task,
      status: (isNowCompleted ? 'completed' : 'pending') as TaskStatus,
      completedAt: isNowCompleted ? new Date().toISOString() : null,
    });
  };

  const handleCreateNewTask = () => {
    const newTask: Task = {
      id: `task-manual-${Date.now()}`,
      title: 'New Task',
      priority: 'medium',
      estimatedMinutes: 45,
      status: 'pending',
      createdAt: new Date().toISOString(),
      deadline: 'Today',
    };
    createTask(newTask);
    setSelectedTask(newTask);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">All Tasks</h1>
          <p className="text-xs text-neutral-400 mt-1">
            {tasks.length} total tasks registered in your personal workspace.
          </p>
        </div>

        <button
          onClick={handleCreateNewTask}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={13} />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status filter tabs */}
        <div className="flex items-center space-x-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 self-start">
          {(['all', 'pending', 'completed'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                activeFilter === filter
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-2.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500 border border-neutral-800/80 rounded-xl bg-neutral-900/30">
            No tasks found.
          </div>
        ) : (
          filteredTasks.map(task => {
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-neutral-900/30 border-neutral-800/40 text-neutral-500'
                    : 'bg-[#14161d] border-neutral-800/80 hover:border-neutral-700/80 text-neutral-200'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    aria-label={isCompleted ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as completed`}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'border-neutral-600 hover:border-neutral-400 bg-neutral-900/60'
                    }`}
                  >
                    {isCompleted && <Check size={13} strokeWidth={2.5} />}
                  </button>

                  <div className="min-w-0 cursor-pointer" onClick={() => setSelectedTask(task)}>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-sm font-medium truncate ${
                          isCompleted ? 'line-through text-neutral-500' : 'text-neutral-100'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-neutral-500 mt-0.5">
                      <span>{task.estimatedMinutes} mins</span>
                      {task.deadline && (
                        <span className="flex items-center space-x-1 text-neutral-400">
                          <Clock size={11} />
                          <span>{task.deadline}</span>
                        </span>
                      )}
                      {task.feedbackHistory && task.feedbackHistory.length > 0 && (
                        <Badge variant="warning" size="sm">
                          Adapted {task.feedbackHistory.length}x
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <PriorityBadge priority={task.priority} />
                  <button
                    onClick={() => setSelectedTask(task)}
                    aria-label={`Edit task "${task.title}"`}
                    className="p-1.5 text-neutral-500 hover:text-neutral-300 rounded-md hover:bg-neutral-800 transition-colors"
                    title="Edit task"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Edit Modal */}
      <TaskEditModal
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onSave={updateTask}
        onDelete={deleteTask}
      />
    </div>
  );
};
