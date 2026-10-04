import type { Task } from '../../types/task';
import type { Plan } from '../../types/plan';
import type { UserPreferences } from '../../types/preferences';
import { DEFAULT_PREFERENCES } from '../../types/preferences';


const todayDate = new Date().toISOString().split('T')[0];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-dbms-ch3',
    title: 'DBMS Chapter 3: Indexing & Hashing',
    description: 'Read through B+ tree indexing and dynamic hashing sections.',
    deadline: 'Today',
    priority: 'high',
    estimatedMinutes: 60,
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    scheduledDate: todayDate,
  },
  {
    id: 'task-dbms-assign',
    title: 'DBMS Assignment: Query Optimization',
    description: 'Solve problem set 4 and write relational algebra proofs.',
    deadline: 'Thursday',
    priority: 'high',
    estimatedMinutes: 75,
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    scheduledDate: todayDate,
  },
  {
    id: 'task-class',
    title: 'Distributed Systems Lecture',
    description: 'Weekly seminar room 402 or online link.',
    deadline: 'Today',
    priority: 'high',
    estimatedMinutes: 60,
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    scheduledDate: todayDate,
    timeConstraint: {
      fixedStartTime: '14:00',
      fixedEndTime: '15:00',
    },
  },
  {
    id: 'task-dbms-exam',
    title: 'DBMS Final Exam',
    description: 'Comprehensive exam covering relational theory and transaction management.',
    deadline: 'Friday',
    priority: 'urgent',
    estimatedMinutes: 120,
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    targetDay: 'Friday',
  },
];

export const INITIAL_PLAN: Plan = {
  id: `plan-${todayDate}`,
  date: todayDate,
  generatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  items: [
    {
      id: 'sched-1',
      taskId: 'task-dbms-ch3',
      title: 'DBMS Chapter 3: Indexing & Hashing',
      type: 'task',
      startTime: '09:00',
      endTime: '10:00',
      durationMinutes: 60,
      status: 'completed',
      completedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      priority: 'high',
    },
    {
      id: 'sched-break-1',
      title: 'Coffee & Refresh',
      type: 'break',
      startTime: '10:00',
      endTime: '10:15',
      durationMinutes: 15,
      status: 'completed',
    },
    {
      id: 'sched-2',
      taskId: 'task-dbms-assign',
      title: 'DBMS Assignment: Query Optimization',
      type: 'task',
      startTime: '10:15',
      endTime: '11:30',
      durationMinutes: 75,
      status: 'scheduled',
      priority: 'high',
      deadlineNotice: 'Due Thursday',
    },
    {
      id: 'sched-break-2',
      title: 'Lunch & Break',
      type: 'break',
      startTime: '11:30',
      endTime: '12:30',
      durationMinutes: 60,
      status: 'scheduled',
    },
    {
      id: 'sched-3',
      taskId: 'task-class',
      title: 'Distributed Systems Lecture',
      type: 'task',
      startTime: '14:00',
      endTime: '15:00',
      durationMinutes: 60,
      status: 'scheduled',
      isFixedTime: true,
      priority: 'high',
    },
  ],
};

export const INITIAL_PREFERENCES: UserPreferences = {
  ...DEFAULT_PREFERENCES,
};
