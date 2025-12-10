import { Activity, TimeLog } from '../types';

export const LEVEL_THRESHOLDS = [0, 1, 11, 41, 101, 251];

export const LEVEL_LABELS = [
  'Не начинал',
  'Знакомство', 
  'Основы',
  'Практик',
  'Уверенный',
  'Эксперт'
];

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Критично',
  2: 'Важно', 
  3: 'Желательно'
};

export const TYPE_ICONS: Record<string, string> = {
  course: '📚',
  book: '📖',
  practice: '💪',
  project: '🚀',
  article: '📄'
};

export const STATUS_LABELS: Record<string, string> = {
  planned: 'План',
  active: 'В процессе',
  completed: 'Завершено'
};

export function calculateLevel(weightedHours: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (weightedHours >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

export function getSkillHours(
  skillId: number,
  activities: Activity[],
  timeLogs: TimeLog[]
): number {
  let total = 0;
  
  activities.forEach(activity => {
    const link = activity.skills.find(s => s.skillId === skillId);
    if (link) {
      const hours = timeLogs
        .filter(log => log.activityId === activity.id)
        .reduce((sum, log) => sum + log.hours, 0);
      total += hours * link.weight;
    }
  });
  
  return total;
}

export function getActivityHours(activityId: number, timeLogs: TimeLog[]): number {
  return timeLogs
    .filter(log => log.activityId === activityId)
    .reduce((sum, log) => sum + log.hours, 0);
}

export function generateId(): number {
  return Date.now() + Math.random();
}
