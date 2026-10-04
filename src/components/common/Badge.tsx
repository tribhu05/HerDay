import React from 'react';
import type { Priority } from '../../types/task';


interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'urgent' | 'high' | 'medium' | 'low' | 'neutral' | 'success' | 'warning';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    default: 'bg-neutral-800 text-neutral-300 border border-neutral-700/60',
    urgent: 'bg-red-950/60 text-red-300 border border-red-800/60',
    high: 'bg-amber-950/50 text-amber-300 border border-amber-800/50',
    medium: 'bg-blue-950/40 text-blue-300 border border-blue-800/40',
    low: 'bg-neutral-800/80 text-neutral-400 border border-neutral-700/50',
    neutral: 'bg-neutral-900 text-neutral-400 border border-neutral-800',
    success: 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50',
    warning: 'bg-amber-950/50 text-amber-300 border border-amber-800/50',
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded tracking-wide ${sizeClasses} ${variantClasses}`}
    >
      {children}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const map: Record<Priority, { label: string; variant: 'urgent' | 'high' | 'medium' | 'low' }> = {
    urgent: { label: 'Urgent', variant: 'urgent' },
    high: { label: 'High', variant: 'high' },
    medium: { label: 'Medium', variant: 'medium' },
    low: { label: 'Low', variant: 'low' },
  };

  const item = map[priority] || { label: priority, variant: 'medium' };
  return <Badge variant={item.variant}>{item.label}</Badge>;
};
