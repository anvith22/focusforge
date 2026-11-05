import { Request, Response, NextFunction } from 'express';
import { query } from '../../db/pool.js';

interface SubtaskSuggestion {
  title: string;
  estimated_minutes: number;
  tip?: string;
}

export async function breakDownTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;

    // Fetch the task and its project
    const taskRes = await query(
      `
      SELECT t.*, p.name as project_name 
      FROM tasks t 
      JOIN projects p ON p.id = t.project_id 
      WHERE t.id = $1
      `,
      [taskId]
    );

    if (taskRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskRes.rows[0];
    const taskTitle = task.title.trim();
    const taskDesc = (task.description || '').trim();

    // Check if GEMINI_API_KEY is available
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are an expert engineering productivity coach. Break down this technical/engineering task into 3 to 5 concrete, actionable, low-friction micro-subtasks (each taking 10-25 minutes).
Task Title: "${taskTitle}"
Task Context/Description: "${taskDesc}"
Project: "${task.project_name}"

Respond ONLY with a valid JSON array of objects with keys: "title" (string, start with an active imperative verb), "estimated_minutes" (integer between 10 and 30), and "tip" (short 1-sentence anti-procrastination advice). No markdown code blocks, just raw JSON.`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = (await geminiRes.json()) as any;
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return res.json({
                task_id: taskId,
                source: 'gemini_ai',
                suggestions: parsed,
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to smart heuristic:', geminiErr);
      }
    }

    // Heuristic intelligent task decomposition engine (anti-procrastination breakdown)
    const suggestions: SubtaskSuggestion[] = generateSmartBreakdown(taskTitle, taskDesc);

    res.json({
      task_id: taskId,
      source: 'smart_engine',
      suggestions,
    });
  } catch (err) {
    next(err);
  }
}

function generateSmartBreakdown(title: string, desc: string): SubtaskSuggestion[] {
  const lower = title.toLowerCase();

  if (lower.includes('bug') || lower.includes('fix') || lower.includes('error') || lower.includes('issue')) {
    return [
      {
        title: `Reproduce "${title}" with minimal test case or curl/log inspection`,
        estimated_minutes: 15,
        tip: 'Do not touch code yet. Simply isolate the exact line or payload triggering the failure.',
      },
      {
        title: 'Locate root cause and draft fix in an isolated branch/function',
        estimated_minutes: 25,
        tip: 'Focus on minimal viable correction rather than broader refactoring.',
      },
      {
        title: 'Run test suite & verify regression edge cases',
        estimated_minutes: 15,
        tip: 'Confirm the happy path still works alongside the resolved defect.',
      },
      {
        title: 'Commit clean change & verify in development environment',
        estimated_minutes: 10,
        tip: 'Write a concise commit message detailing what caused the bug and how it was fixed.',
      },
    ];
  }

  if (lower.includes('api') || lower.includes('endpoint') || lower.includes('backend') || lower.includes('route')) {
    return [
      {
        title: `Define input/output Zod schema & SQL query for "${title}"`,
        estimated_minutes: 20,
        tip: 'Lock in the contract and validation bounds before writing controller logic.',
      },
      {
        title: 'Implement controller handler and register express route',
        estimated_minutes: 25,
        tip: 'Keep the controller thin, delegating DB queries and parsing to standard modules.',
      },
      {
        title: 'Write integration test verifying 200 success and 400/404 error cases',
        estimated_minutes: 20,
        tip: 'A passing test prevents regression and gives immediate completion satisfaction.',
      },
    ];
  }

  if (lower.includes('ui') || lower.includes('component') || lower.includes('frontend') || lower.includes('page')) {
    return [
      {
        title: `Draft static layout & component structure for "${title}"`,
        estimated_minutes: 20,
        tip: 'Build the visual hierarchy with placeholder data first without hooking state.',
      },
      {
        title: 'Hook up state management, TanStack query, and event handlers',
        estimated_minutes: 25,
        tip: 'Handle loading, empty, and error states gracefully.',
      },
      {
        title: 'Refine responsive styling and polish hover/focus interactions',
        estimated_minutes: 15,
        tip: 'Test on both mobile drawer and desktop viewport.',
      },
    ];
  }

  // General Software Engineering Anti-Procrastination Breakdown
  return [
    {
      title: `Define 1-page spec & verify requirements for "${title}"`,
      estimated_minutes: 15,
      tip: 'The biggest cause of procrastination is ambiguity. Clarify exactly what "done" looks like.',
    },
    {
      title: 'Scaffold core module / minimal implementation slice',
      estimated_minutes: 25,
      tip: 'Aim for a rough working prototype (tracer bullet) before polishing.',
    },
    {
      title: 'Handle boundary conditions, edge cases, and error states',
      estimated_minutes: 20,
      tip: 'Think about empty inputs, network timeouts, or invalid states.',
    },
    {
      title: 'Final smoke test, self-code-review, and clean git commit',
      estimated_minutes: 15,
      tip: 'Celebrate the micro-win: momentum builds from shipped increments.',
    },
  ];
}

