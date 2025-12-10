import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userGoal } = req.body;

  if (!userGoal || typeof userGoal !== 'string') {
    return res.status(400).json({ error: 'userGoal is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\n\nЦель пользователя: ${userGoal}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', response.status, errorData);

      // Parse error message from Gemini
      try {
        const errorJson = JSON.parse(errorData);
        const message = errorJson.error?.message || 'Gemini API error';
        return res.status(500).json({ error: message });
      } catch {
        return res.status(500).json({ error: `Gemini API error: ${response.status}` });
      }
    }

    const data = await response.json();

    // Extract text from Gemini response
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return res.status(500).json({ error: 'Empty response from Gemini' });
    }

    // Parse JSON from response
    let parsed: OnboardingResponse;
    try {
      // Clean up potential markdown formatting
      const cleanJson = textContent.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', textContent);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Validate response structure
    if (!Array.isArray(parsed.skills) || !Array.isArray(parsed.activities)) {
      return res.status(500).json({ error: 'Invalid response structure from AI' });
    }

    // Validate and sanitize skills
    const validSkills = parsed.skills
      .filter(s => s.name && typeof s.name === 'string')
      .map(s => ({
        name: s.name.trim(),
        targetLevel: Math.min(5, Math.max(1, Number(s.targetLevel) || 3)),
        priority: ([1, 2, 3].includes(s.priority) ? s.priority : 2) as 1 | 2 | 3,
      }));

    // Validate and sanitize activities
    const validTypes = ['course', 'book', 'practice', 'project', 'article'];
    const skillNames = new Set(validSkills.map(s => s.name));

    const validActivities = parsed.activities
      .filter(a => a.name && typeof a.name === 'string')
      .map(a => ({
        name: a.name.trim(),
        type: (validTypes.includes(a.type) ? a.type : 'course') as OnboardingActivity['type'],
        skillNames: Array.isArray(a.skillNames)
          ? a.skillNames.filter(sn => skillNames.has(sn))
          : [],
      }))
      .filter(a => a.skillNames.length > 0);

    return res.status(200).json({
      skills: validSkills,
      activities: validActivities,
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
