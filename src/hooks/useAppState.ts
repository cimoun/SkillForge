import { useState, useEffect } from 'react';
import { AppState, Skill, Activity, TimeLog } from '../types';
import { generateId } from '../utils';

const STORAGE_KEY = 'skillforge_data';

const defaultState: AppState = {
  skills: [],
  activities: [],
  timeLogs: []
};

export function useAppState() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultState;
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addSkill = (skill: Omit<Skill, 'id'>) => {
    setState(s => ({
      ...s,
      skills: [...s.skills, { ...skill, id: generateId() }]
    }));
  };

  const updateSkill = (id: number, updates: Partial<Skill>) => {
    setState(s => ({
      ...s,
      skills: s.skills.map(sk => sk.id === id ? { ...sk, ...updates } : sk)
    }));
  };

  const deleteSkill = (id: number) => {
    setState(s => ({
      ...s,
      skills: s.skills.filter(sk => sk.id !== id),
      activities: s.activities.map(a => ({
        ...a,
        skills: a.skills.filter(sl => sl.skillId !== id)
      }))
    }));
  };

  const addActivity = (activity: Omit<Activity, 'id'>) => {
    setState(s => ({
      ...s,
      activities: [...s.activities, { ...activity, id: generateId() }]
    }));
  };

  const updateActivity = (id: number, updates: Partial<Activity>) => {
    setState(s => ({
      ...s,
      activities: s.activities.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const deleteActivity = (id: number) => {
    setState(s => ({
      ...s,
      activities: s.activities.filter(a => a.id !== id),
      timeLogs: s.timeLogs.filter(t => t.activityId !== id)
    }));
  };

  const addTimeLog = (log: Omit<TimeLog, 'id'>) => {
    setState(s => ({
      ...s,
      timeLogs: [...s.timeLogs, { ...log, id: generateId() }]
    }));
  };

  const deleteTimeLog = (id: number) => {
    setState(s => ({
      ...s,
      timeLogs: s.timeLogs.filter(t => t.id !== id)
    }));
  };

  const clearAll = () => {
    setState(defaultState);
  };

  const importData = (skills: Skill[], activities: Activity[]) => {
    setState(s => ({
      ...s,
      skills: [...s.skills, ...skills],
      activities: [...s.activities, ...activities]
    }));
  };

  return {
    ...state,
    addSkill,
    updateSkill,
    deleteSkill,
    addActivity,
    updateActivity,
    deleteActivity,
    addTimeLog,
    deleteTimeLog,
    clearAll,
    importData
  };
}
