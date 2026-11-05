import { z } from 'zod';

export const startSessionSchema = z.object({
  task_id: z.string().uuid('Invalid task ID').optional().nullable(),
  planned_minutes: z.number().int().min(1).max(180).default(25),
  cycle_number: z.number().int().min(1).max(20).default(1),
});

export const completeSessionSchema = z.object({
  actual_seconds: z.number().int().min(0, 'Actual seconds must be non-negative'),
  accomplishment: z.string().trim().max(1000).optional().default(''),
  blockers: z.string().trim().max(1000).optional().default(''),
  next_action: z.string().trim().max(1000).optional().default(''),
});

export const abandonSessionSchema = z.object({
  actual_seconds: z.number().int().min(0).default(0),
  blockers: z.string().trim().max(1000).optional().default(''),
  next_action: z.string().trim().max(1000).optional().default(''),
  friction_category: z
    .enum(['none', 'fatigue', 'interruption', 'scope_creep', 'complexity', 'unclear', 'other'])
    .default('none'),
});

export const sessionIdParamSchema = z.object({
  id: z.string().uuid('Invalid session ID'),
});

export const sessionQuerySchema = z.object({
  status: z.enum(['running', 'completed', 'abandoned']).optional(),
  task_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
