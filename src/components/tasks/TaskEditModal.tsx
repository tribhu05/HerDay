import React, { useState } from 'react';
import type { Task, Priority, TaskStatus } from '../../types/task';
import { Modal } from '../common/Modal';

import { Trash2 } from 'lucide-react';

interface TaskEditModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  if (!task) return null;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [deadline, setDeadline] = useState(task.deadline || '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes);
  const [status, setStatus] = useState<TaskStatus>(task.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...task,
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: deadline.trim() || null,
      priority,
      estimatedMinutes: Math.max(15, estimatedMinutes),
      status,
      completedAt: status === 'completed' && !task.completedAt ? new Date().toISOString() : task.completedAt,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${task.title}"?`)) {
      onDelete(task.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Details"
      subtitle="Modify deadlines, duration, priority, and progress"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            Task Name
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            Notes / Details
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Context or notes..."
            className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 resize-none"
          />
        </div>

        {/* Grid for Priority, Effort, Deadline, Status */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
              className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Effort (Minutes)
            </label>
            <input
              type="number"
              step="15"
              min="15"
              value={estimatedMinutes}
              onChange={e => setEstimatedMinutes(parseInt(e.target.value, 10) || 15)}
              className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Deadline
            </label>
            <input
              type="text"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              placeholder="e.g. Friday, Thursday 17:00"
              className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus)}
              className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-neutral-600"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Feedback History if present */}
        {task.feedbackHistory && task.feedbackHistory.length > 0 && (
          <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80 text-xs">
            <span className="font-semibold text-neutral-400 block mb-1">Past Delay Feedback:</span>
            <ul className="space-y-1 text-neutral-400">
              {task.feedbackHistory.map((fb, idx) => (
                <li key={idx} className="flex justify-between text-[11px]">
                  <span>Reason: {fb.reason.replace(/_/g, ' ')}</span>
                  <span className="text-neutral-500 font-mono">
                    {new Date(fb.recordedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
