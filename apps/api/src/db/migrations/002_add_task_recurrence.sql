-- Migration 002: Add task recurrence and schedule options
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none' 
CHECK (recurrence IN ('none', 'daily', 'weekly', 'weekdays', 'persistent'));

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence);
