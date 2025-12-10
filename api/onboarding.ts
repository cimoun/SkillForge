export const config = {
  runtime: 'edge',
};

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

interface OnboardingResponse {
  skills: OnboardingSkill[];
  activities: OnboardingActivity[];
}

const SYSTEM_PROMPT = `Ты — эксперт по обучению и развитию навыков. На основе цели пользователя ты должен составить персонализированный план обучения.

Твоя задача:
1. Проанализировать цель пользователя и его текущий уровень
2. Определить ключевые навыки, которые нужно развить
3. Предложить конкретные активности для обучения

Правила:
- Навыки должны быть конкретными и измеримыми (например, "Python" вместо "Программирование")
- Приоритет 1 = критически важный для цели, 2 = важный, 3 = желательный
- targetLevel от 1 до 5 (1 = базовый, 5 = экспертный)
- Активности должны быть реальными и доступными (курсы на реальных платформах, книги реальных авторов)
- Типы активностей: course, book, practice, project, article
- skillNames должны точно совпадать с названиями навыков из списка skills

Ответь ТОЛЬКО валидным JSON без markdown-форматирования:
{
  "skills": [
    { "name": "Название навыка", "targetLevel": 4, "priority": 1 }
  ],
  "activities": [
    { "name": "Название активности", "type": "course", "skillNames": ["Название навыка"] }
  ]
}`;

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'ok', message: 'Use POST with userGoal', provider: 'OpenRouter' }),
      { status: 200, headers }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  try {
    const body = await req.json();
    const userGoal = body?.userGoal;

    if (!userGoal || typeof userGoal !== 'string') {
      return new Response(
        JSON.stringify({ error: 'userGoal is required' }),
        { status: 400, headers }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENROUTER_API_KEY is not configured' }),
        { status: 500, headers }
      );
    }

    // OpenRouter API (OpenAI-compatible)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://skillforge.vercel.app',
        'X-Title': 'SkillForge',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Цель пользователя: ${userGoal}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `OpenRouter API error: ${response.status}` }),
        { status: 500, headers }
      );
    }

    const data = await response.json();
    const textContent = data.choices?.[0]?.message?.content;

    if (!textContent) {
      return new Response(
        JSON.stringify({ error: 'Empty response from OpenRouter' }),
        { status: 500, headers }
      );
    }

    let parsed: OnboardingResponse;
    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : textContent;
      parsed = JSON.parse(cleanJson);
    } catch {
      console.error('Failed to parse:', textContent);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers }
      );
    }

    if (!Array.isArray(parsed.skills) || !Array.isArray(parsed.activities)) {
      return new Response(
        JSON.stringify({ error: 'Invalid response structure' }),
        { status: 500, headers }
      );
    }

    const validSkills = parsed.skills
      .filter((s) => s.name && typeof s.name === 'string')
      .map((s) => ({
        name: s.name.trim(),
        targetLevel: Math.min(5, Math.max(1, Number(s.targetLevel) || 3)),
        priority: ([1, 2, 3].includes(s.priority) ? s.priority : 2) as 1 | 2 | 3,
      }));

    const validTypes = ['course', 'book', 'practice', 'project', 'article'];
    const skillNames = new Set(validSkills.map((s) => s.name));

    const validActivities = parsed.activities
      .filter((a) => a.name && typeof a.name === 'string')
      .map((a) => ({
        name: a.name.trim(),
        type: (validTypes.includes(a.type) ? a.type : 'course') as OnboardingActivity['type'],
        skillNames: Array.isArray(a.skillNames)
          ? a.skillNames.filter((sn) => skillNames.has(sn))
          : [],
      }))
      .filter((a) => a.skillNames.length > 0);

    return new Response(
      JSON.stringify({ skills: validSkills, activities: validActivities }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Onboarding error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
}
