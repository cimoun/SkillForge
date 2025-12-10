import React, { useState } from 'react';
import {
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import { Plus, Clock, Target, Flame, BookOpen, Trash2, X } from 'lucide-react';

import { useAppState } from './hooks/useAppState';
import { Skill, Activity } from './types';
import {
  calculateLevel, getSkillHours, getActivityHours,
  LEVEL_LABELS, PRIORITY_LABELS, TYPE_ICONS, STATUS_LABELS
} from './utils';

type Tab = 'radar' | 'skills' | 'activities';

export default function App() {
  const {
    skills, activities, timeLogs,
    addSkill, deleteSkill,
    addActivity, updateActivity, deleteActivity,
    addTimeLog
  } = useAppState();

  const [tab, setTab] = useState<Tab>('radar');
  const [modal, setModal] = useState<'skill' | 'activity' | 'time' | null>(null);

  // Form state
  const [skillForm, setSkillForm] = useState({ name: '', targetLevel: 3, priority: 2 as 1|2|3 });
  const [activityForm, setActivityForm] = useState<Omit<Activity, 'id'>>({ 
    name: '', type: 'course', status: 'planned', skills: [] 
  });
  const [timeForm, setTimeForm] = useState({ 
    activityId: 0, hours: 1, date: new Date().toISOString().split('T')[0] 
  });

  // Radar data
  const radarData = skills.map(skill => {
    const hours = getSkillHours(skill.id, activities, timeLogs);
    return {
      name: skill.name,
      current: calculateLevel(hours),
      target: skill.targetLevel
    };
  });

  // Stats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekHours = timeLogs
    .filter(l => new Date(l.date) >= weekAgo)
    .reduce((s, l) => s + l.hours, 0);

  // Handlers
  const handleAddSkill = () => {
    if (!skillForm.name.trim()) return;
    addSkill(skillForm);
    setSkillForm({ name: '', targetLevel: 3, priority: 2 });
    setModal(null);
  };

  const handleAddActivity = () => {
    if (!activityForm.name.trim()) return;
    addActivity(activityForm);
    setActivityForm({ name: '', type: 'course', status: 'planned', skills: [] });
    setModal(null);
  };

  const handleLogTime = () => {
    if (!timeForm.activityId || timeForm.hours <= 0) return;
    addTimeLog(timeForm);
    setTimeForm({ activityId: 0, hours: 1, date: new Date().toISOString().split('T')[0] });
    setModal(null);
  };

  const toggleSkillLink = (skillId: number) => {
    const exists = activityForm.skills.find(s => s.skillId === skillId);
    setActivityForm({
      ...activityForm,
      skills: exists
        ? activityForm.skills.filter(s => s.skillId !== skillId)
        : [...activityForm.skills, { skillId, weight: 0.5 }]
    });
  };

  const updateWeight = (skillId: number, weight: number) => {
    setActivityForm({
      ...activityForm,
      skills: activityForm.skills.map(s => 
        s.skillId === skillId ? { ...s, weight } : s
      )
    });
  };

  const cycleStatus = (id: number, current: string) => {
    const next = { planned: 'active', active: 'completed', completed: 'planned' } as const;
    updateActivity(id, { status: next[current as keyof typeof next] });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="text-orange-500" size={24} />
            <span className="text-xl font-semibold">SkillForge</span>
          </div>
          <button
            onClick={() => setModal('time')}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Clock size={16} />
            Залогировать
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {[
            { id: 'radar', label: 'Радар', icon: Target },
            { id: 'skills', label: 'Навыки', icon: Flame },
            { id: 'activities', label: 'Активности', icon: BookOpen },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.id 
                  ? 'border-orange-500 text-orange-500' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* Radar Tab */}
        {tab === 'radar' && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-900 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{weekHours.toFixed(1)}</div>
                <div className="text-xs text-zinc-500 mt-1">часов за неделю</div>
              </div>
              <div className="bg-zinc-900 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{skills.length}</div>
                <div className="text-xs text-zinc-500 mt-1">навыков</div>
              </div>
              <div className="bg-zinc-900 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{activities.filter(a => a.status === 'active').length}</div>
                <div className="text-xs text-zinc-500 mt-1">активных</div>
              </div>
            </div>

            {/* Radar chart */}
            <div className="bg-zinc-900 rounded-xl p-6">
              {skills.length >= 3 ? (
                <ResponsiveContainer width="100%" height={360}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#3f3f46" />
                    <PolarAngleAxis 
                      dataKey="name" 
                      tick={{ fill: '#a1a1aa', fontSize: 12 }} 
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 5]} 
                      tick={{ fill: '#52525b', fontSize: 10 }}
                    />
                    <Radar
                      name="Цель"
                      dataKey="target"
                      stroke="#60a5fa"
                      fill="#60a5fa"
                      fillOpacity={0.1}
                      strokeDasharray="4 4"
                    />
                    <Radar
                      name="Текущий"
                      dataKey="current"
                      stroke="#f97316"
                      fill="#f97316"
                      fillOpacity={0.25}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
                  <Target size={48} className="mb-3 opacity-30" />
                  <p>Добавьте минимум 3 навыка</p>
                </div>
              )}
              
              {skills.length >= 3 && (
                <div className="flex justify-center gap-6 mt-4 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    Текущий
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-blue-400 border-dashed" />
                    Цель
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skills Tab */}
        {tab === 'skills' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">Навыки</h2>
              <button
                onClick={() => setModal('skill')}
                className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-400"
              >
                <Plus size={16} />
                Добавить
              </button>
            </div>

            {skills.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Target size={48} className="mx-auto mb-3 opacity-30" />
                <p>Пока нет навыков</p>
              </div>
            ) : (
              <div className="space-y-2">
                {skills.map(skill => {
                  const hours = getSkillHours(skill.id, activities, timeLogs);
                  const level = calculateLevel(hours);
                  const progress = (level / skill.targetLevel) * 100;
                  
                  return (
                    <div key={skill.id} className="bg-zinc-900 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-medium">{skill.name}</span>
                          <span className={`ml-2 text-xs ${
                            skill.priority === 1 ? 'text-red-400' :
                            skill.priority === 2 ? 'text-yellow-400' : 'text-zinc-500'
                          }`}>
                            {PRIORITY_LABELS[skill.priority]}
                          </span>
                        </div>
                        <button 
                          onClick={() => deleteSkill(skill.id)}
                          className="text-zinc-600 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="text-sm text-zinc-400 mb-2">
                        {level} → {skill.targetLevel} · {LEVEL_LABELS[level]} · {hours.toFixed(1)}ч
                      </div>
                      
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Activities Tab */}
        {tab === 'activities' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">Активности</h2>
              <button
                onClick={() => setModal('activity')}
                className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-400"
              >
                <Plus size={16} />
                Добавить
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                <p>Пока нет активностей</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map(activity => {
                  const hours = getActivityHours(activity.id, timeLogs);
                  const linkedSkills = activity.skills
                    .map(s => skills.find(sk => sk.id === s.skillId)?.name)
                    .filter(Boolean);
                  
                  return (
                    <div key={activity.id} className="bg-zinc-900 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span>{TYPE_ICONS[activity.type]}</span>
                          <span className="font-medium">{activity.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => cycleStatus(activity.id, activity.status)}
                            className={`px-2 py-0.5 rounded text-xs ${
                              activity.status === 'completed' ? 'bg-green-900 text-green-400' :
                              activity.status === 'active' ? 'bg-blue-900 text-blue-400' :
                              'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {STATUS_LABELS[activity.status]}
                          </button>
                          <button 
                            onClick={() => deleteActivity(activity.id)}
                            className="text-zinc-600 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-zinc-500 mt-2">
                        {hours.toFixed(1)}ч · {linkedSkills.join(', ') || 'не связано'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md relative">
            <button 
              onClick={() => setModal(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
            >
              <X size={20} />
            </button>

            {/* Add Skill */}
            {modal === 'skill' && (
              <>
                <h3 className="text-lg font-medium mb-4">Новый навык</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Название"
                    value={skillForm.name}
                    onChange={e => setSkillForm({ ...skillForm, name: e.target.value })}
                    className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <div>
                    <label className="text-sm text-zinc-400 block mb-2">
                      Цель: {skillForm.targetLevel} ({LEVEL_LABELS[skillForm.targetLevel]})
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={skillForm.targetLevel}
                      onChange={e => setSkillForm({ ...skillForm, targetLevel: +e.target.value })}
                      className="w-full accent-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 block mb-2">Приоритет</label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(p => (
                        <button
                          key={p}
                          onClick={() => setSkillForm({ ...skillForm, priority: p as 1|2|3 })}
                          className={`flex-1 py-2 rounded-lg text-sm transition ${
                            skillForm.priority === p
                              ? 'bg-orange-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          {PRIORITY_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAddSkill}
                    className="w-full bg-orange-600 hover:bg-orange-500 py-2.5 rounded-lg font-medium transition"
                  >
                    Добавить
                  </button>
                </div>
              </>
            )}

            {/* Add Activity */}
            {modal === 'activity' && (
              <>
                <h3 className="text-lg font-medium mb-4">Новая активность</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Название"
                    value={activityForm.name}
                    onChange={e => setActivityForm({ ...activityForm, name: e.target.value })}
                    className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <div>
                    <label className="text-sm text-zinc-400 block mb-2">Тип</label>
                    <div className="grid grid-cols-5 gap-2">
                      {Object.entries(TYPE_ICONS).map(([type, icon]) => (
                        <button
                          key={type}
                          onClick={() => setActivityForm({ ...activityForm, type: type as Activity['type'] })}
                          className={`py-2 rounded-lg text-lg transition ${
                            activityForm.type === type
                              ? 'bg-orange-600'
                              : 'bg-zinc-800 hover:bg-zinc-700'
                          }`}
                          title={type}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  {skills.length > 0 && (
                    <div>
                      <label className="text-sm text-zinc-400 block mb-2">Связь с навыками</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {skills.map(skill => {
                          const link = activityForm.skills.find(s => s.skillId === skill.id);
                          return (
                            <div key={skill.id} className="flex items-center gap-3 bg-zinc-800 rounded-lg p-2">
                              <input
                                type="checkbox"
                                checked={!!link}
                                onChange={() => toggleSkillLink(skill.id)}
                                className="accent-orange-500"
                              />
                              <span className="flex-1 text-sm">{skill.name}</span>
                              {link && (
                                <input
                                  type="number"
                                  min="0.1"
                                  max="1"
                                  step="0.1"
                                  value={link.weight}
                                  onChange={e => updateWeight(skill.id, +e.target.value)}
                                  className="w-16 bg-zinc-700 rounded px-2 py-1 text-sm text-center"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleAddActivity}
                    className="w-full bg-orange-600 hover:bg-orange-500 py-2.5 rounded-lg font-medium transition"
                  >
                    Добавить
                  </button>
                </div>
              </>
            )}

            {/* Log Time */}
            {modal === 'time' && (
              <>
                <h3 className="text-lg font-medium mb-4">Залогировать время</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-zinc-400 block mb-2">Активность</label>
                    <select
                      value={timeForm.activityId}
                      onChange={e => setTimeForm({ ...timeForm, activityId: +e.target.value })}
                      className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value={0}>Выберите...</option>
                      {activities.filter(a => a.status !== 'completed').map(a => (
                        <option key={a.id} value={a.id}>
                          {TYPE_ICONS[a.type]} {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-zinc-400 block mb-2">Часы</label>
                      <input
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={timeForm.hours}
                        onChange={e => setTimeForm({ ...timeForm, hours: +e.target.value })}
                        className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 block mb-2">Дата</label>
                      <input
                        type="date"
                        value={timeForm.date}
                        onChange={e => setTimeForm({ ...timeForm, date: e.target.value })}
                        className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleLogTime}
                    className="w-full bg-orange-600 hover:bg-orange-500 py-2.5 rounded-lg font-medium transition"
                  >
                    Сохранить
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
