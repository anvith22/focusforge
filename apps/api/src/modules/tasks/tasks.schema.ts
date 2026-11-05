import { z } from 'zod';

export const createTaskSchema = z.object({
  project_id: z.string().uuid('Valid project_id is required'),
  title: z.string().trim().min(1, 'Task title is required').max(200),
  description: z.string().trim().max(1000).default(''),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  estimated_minutes: z.number().int().min(5).max(240).default(25).optional(),
  sort_order: z.number().int().min(0).optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'weekdays', 'persistent']).default('none'),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'due_date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),
});

export const updateTaskSchema = z.object({
  project_id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  estimated_minutes: z.number().int().min(5).max(240).optional(),
  sort_order: z.number().int().min(0).optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'weekdays', 'persistent']).optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export const taskIdParamSchema = z.object({
  id: z.string().uuid('Invalid task ID'),
});

export const taskQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().trim().max(200).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
