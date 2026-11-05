-- FocusForge Migration 004: Add estimated_minutes to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER NOT NULL DEFAULT 25
CHECK (estimated_minutes >= 5 AND estimated_minutes <= 240);

