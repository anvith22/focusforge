import { z } from 'zod';

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1, 'Subtask title cannot be empty').max(300),
  position: z.number().int().optional(),
});

export const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  completed: z.boolean().optional(),
  position: z.number().int().optional(),
});

export const reorderSubtasksSchema = z.object({
  subtask_ids: z.array(z.string().uuid()),
});

