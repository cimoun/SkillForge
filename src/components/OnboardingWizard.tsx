import { useState } from 'react';
import { Sparkles, Loader2, Check, X, Pencil, ChevronRight, Target, BookOpen } from 'lucide-react';
import type { Skill, Activity, SkillLink } from '../types';
import { generateId } from '../utils';
import { PRIORITY_LABELS, TYPE_ICONS } from '../utils';

interface OnboardingSkill {
  name: string;
  targetLevel: number;
  priority: 1 | 2 | 3;
}

interface OnboardingActivity {
  name: string;
  type: 'course' | 'book' | 'practice' | 'project' | 'article';
  skillNames: string[];
}

interface OnboardingResult {
  skills: OnboardingSkill[];
  activities: OnboardingActivity[];
}

interface Props {
  onComplete: (skills: Skill[], activities: Activity[]) => void;
}

type Step = 'welcome' | 'loading' | 'review' | 'editing';

export default function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [userGoal, setUserGoal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);
  const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!userGoal.trim()) {
      setError('Пожалуйста, опишите вашу цель');
      return;
    }

    setStep('loading');
    setError(null);

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userGoal: userGoal.trim() }),
      });

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Сервер вернул некорректный ответ');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при генерации плана');
      }

      if (!data.skills || !data.activities) {
        throw new Error('Некорректная структура ответа от AI');
      }

      setResult(data as OnboardingResult);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      setStep('welcome');
    }
  };

  const handleConfirm = () => {
    if (!result) return;

    // Convert onboarding skills to app skills with IDs
    const skills: Skill[] = result.skills.map(s => ({
      id: generateId(),
      name: s.name,
      targetLevel: s.targetLevel,
      priority: s.priority,
    }));

    // Create skill name to ID map
    const skillNameToId = new Map(skills.map(s => [s.name, s.id]));

    // Convert onboarding activities to app activities with proper skill links
    const activities: Activity[] = result.activities.map(a => {
      const skillLinks: SkillLink[] = a.skillNames
        .map(name => skillNameToId.get(name))
        .filter((id): id is number => id !== undefined)
        .map(skillId => ({ skillId, weight: 1 }));

      return {
        id: generateId(),
        name: a.name,
        type: a.type,
        status: 'planned' as const,
        skills: skillLinks,
      };
    });

    onComplete(skills, activities);
  };

  const updateSkill = (index: number, updates: Partial<OnboardingSkill>) => {
    if (!result) return;
    const newSkills = [...result.skills];
    newSkills[index] = { ...newSkills[index], ...updates };
    setResult({ ...result, skills: newSkills });
  };

  const removeSkill = (index: number) => {
    if (!result) return;
    const skillName = result.skills[index].name;
    const newSkills = result.skills.filter((_, i) => i !== index);
    // Also remove this skill from activities
    const newActivities = result.activities.map(a => ({
      ...a,
      skillNames: a.skillNames.filter(n => n !== skillName),
    })).filter(a => a.skillNames.length > 0);
    setResult({ skills: newSkills, activities: newActivities });
  };

  const updateActivity = (index: number, updates: Partial<OnboardingActivity>) => {
    if (!result) return;
    const newActivities = [...result.activities];
    newActivities[index] = { ...newActivities[index], ...updates };
    setResult({ ...result, activities: newActivities });
  };

  const removeActivity = (index: number) => {
    if (!result) return;
    const newActivities = result.activities.filter((_, i) => i !== index);
    setResult({ ...result, activities: newActivities });
  };

  // Welcome screen
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 mb-4">
              <Sparkles className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Добро пожаловать в SkillForge
            </h1>
            <p className="text-zinc-400">
              Расскажите о своей цели, и ИИ составит персонализированный план обучения
            </p>
          </div>

          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Какова ваша цель обучения?
            </label>
            <textarea
              value={userGoal}
              onChange={(e) => setUserGoal(e.target.value)}
              placeholder="Например: Хочу стать data scientist, знаю немного Python и базовую математику..."
              className="w-full h-32 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />

            {error && (
              <p className="mt-2 text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              className="w-full mt-4 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Сгенерировать план
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <p className="text-center text-zinc-500 text-sm mt-4">
            Powered by Google Gemini
          </p>
        </div>
      </div>
    );
  }

  // Loading screen
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Анализируем вашу цель...</p>
          <p className="text-zinc-500 mt-2">Генерируем персональный план обучения</p>
        </div>
      </div>
    );
  }

  // Review screen
  if (step === 'review' && result) {
    return (
      <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mb-4">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Ваш план обучения готов!
            </h1>
            <p className="text-zinc-400">
              Проверьте и при необходимости отредактируйте
            </p>
          </div>

          {/* Skills section */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-white">
                Навыки ({result.skills.length})
              </h2>
            </div>

            <div className="space-y-3">
              {result.skills.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
                >
                  {editingSkillIndex === index ? (
                    <div className="flex-1 flex flex-wrap gap-2 items-center">
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) => updateSkill(index, { name: e.target.value })}
                        className="flex-1 min-w-[150px] px-3 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-sm"
                      />
                      <select
                        value={skill.targetLevel}
                        onChange={(e) => updateSkill(index, { targetLevel: Number(e.target.value) })}
                        className="px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-sm"
                      >
                        {[1, 2, 3, 4, 5].map(l => (
                          <option key={l} value={l}>Уровень {l}</option>
                        ))}
                      </select>
                      <select
                        value={skill.priority}
                        onChange={(e) => updateSkill(index, { priority: Number(e.target.value) as 1 | 2 | 3 })}
                        className="px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-sm"
                      >
                        {[1, 2, 3].map(p => (
                          <option key={p} value={p}>{PRIORITY_LABELS[p as 1 | 2 | 3]}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setEditingSkillIndex(null)}
                        className="p-1 text-green-500 hover:text-green-400"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="text-white font-medium">{skill.name}</span>
                        <div className="flex gap-3 mt-1 text-xs text-zinc-400">
                          <span>Цель: уровень {skill.targetLevel}</span>
                          <span>{PRIORITY_LABELS[skill.priority]}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingSkillIndex(index)}
                          className="p-2 text-zinc-400 hover:text-white"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSkill(index)}
                          className="p-2 text-zinc-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activities section */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-white">
                Активности ({result.activities.length})
              </h2>
            </div>

            <div className="space-y-3">
              {result.activities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
                >
                  {editingActivityIndex === index ? (
                    <div className="flex-1 flex flex-wrap gap-2 items-center">
                      <input
                        type="text"
                        value={activity.name}
                        onChange={(e) => updateActivity(index, { name: e.target.value })}
                        className="flex-1 min-w-[200px] px-3 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-sm"
                      />
                      <select
                        value={activity.type}
                        onChange={(e) => updateActivity(index, { type: e.target.value as OnboardingActivity['type'] })}
                        className="px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-sm"
                      >
                        {Object.entries(TYPE_ICONS).map(([type, icon]) => (
                          <option key={type} value={type}>{icon} {type}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setEditingActivityIndex(null)}
                        className="p-1 text-green-500 hover:text-green-400"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{TYPE_ICONS[activity.type]}</span>
                          <span className="text-white font-medium">{activity.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activity.skillNames.map(name => (
                            <span
                              key={name}
                              className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingActivityIndex(index)}
                          className="p-2 text-zinc-400 hover:text-white"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeActivity(index)}
                          className="p-2 text-zinc-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                setStep('welcome');
                setResult(null);
              }}
              className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
            >
              Начать заново
            </button>
            <button
              onClick={handleConfirm}
              disabled={result.skills.length === 0}
              className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Подтвердить и начать
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
