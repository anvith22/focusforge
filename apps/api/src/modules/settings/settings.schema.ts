import { z } from 'zod';

export const updateSettingsSchema = z.object({
  daily_target_minutes: z.number().int().min(1).max(720).optional(),
  default_focus_minutes: z.number().int().min(1).max(180).optional(),
  short_break_minutes: z.number().int().min(1).max(60).optional(),
  long_break_minutes: z.number().int().min(1).max(120).optional(),
  evening_start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  timezone: z.string().min(1).optional(),
  enable_notifications: z.boolean().optional(),
  sound_enabled: z.boolean().optional(),
  sound_volume: z.number().min(0).max(1).optional(),
  ambient_layers: z.record(z.string(), z.number().min(0).max(1)).optional(),
  pomodoro_cycles_target: z.number().int().min(1).max(12).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

