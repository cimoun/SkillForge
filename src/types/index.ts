export interface Skill {
  id: number;
  name: string;
  targetLevel: number;
  priority: 1 | 2 | 3;
}

export interface SkillLink {
  skillId: number;
  weight: number;
}

export interface Activity {
  id: number;
  name: string;
  type: 'course' | 'book' | 'practice' | 'project' | 'article';
  status: 'planned' | 'active' | 'completed';
  skills: SkillLink[];
}

export interface TimeLog {
  id: number;
  activityId: number;
  date: string;
  hours: number;
}

export interface AppState {
  skills: Skill[];
  activities: Activity[];
  timeLogs: TimeLog[];
}
