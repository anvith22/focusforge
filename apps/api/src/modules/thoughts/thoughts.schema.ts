import { z } from 'zod';

export const createThoughtSchema = z.object({
  content: z.string().trim().min(1, 'Thought content cannot be empty'),
  category: z.enum(['urgent_later', 'idea', 'random']).default('idea'),
  session_id: z.string().uuid().nullable().optional(),
});

export const updateThoughtSchema = z.object({
  content: z.string().trim().min(1).optional(),
  category: z.enum(['urgent_later', 'idea', 'random']).optional(),
  converted_to_task: z.boolean().optional(),
});

export const convertThoughtToTaskSchema = z.object({
  project_id: z.string().uuid(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

