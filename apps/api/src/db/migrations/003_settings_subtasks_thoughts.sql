-- FocusForge Migration 003: User Settings, Task Subtasks, Parked Thoughts & Friction Analytics

-- 1. User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    daily_target_minutes INTEGER NOT NULL DEFAULT 60 CHECK (daily_target_minutes > 0),
    default_focus_minutes INTEGER NOT NULL DEFAULT 25 CHECK (default_focus_minutes > 0),
    short_break_minutes INTEGER NOT NULL DEFAULT 5 CHECK (short_break_minutes > 0),
    long_break_minutes INTEGER NOT NULL DEFAULT 15 CHECK (long_break_minutes > 0),
    evening_start_time TEXT NOT NULL DEFAULT '18:30',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    enable_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sound_volume NUMERIC(3, 2) NOT NULL DEFAULT 0.75,
    ambient_layers JSONB NOT NULL DEFAULT '{"lofi": 0, "rain": 0, "brown": 0, "ambient": 0, "alpha": 0}'::jsonb,
    pomodoro_cycles_target INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default settings if empty
INSERT INTO user_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 2. Task Subtasks Table (Atomic Checklists)
CREATE TABLE IF NOT EXISTS task_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON task_subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_position ON task_subtasks(task_id, position);

-- Trigger for subtasks updated_at
CREATE TRIGGER update_task_subtasks_updated_at
BEFORE UPDATE ON task_subtasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3. Parked Thoughts Table (Persistent across devices)
CREATE TABLE IF NOT EXISTS parked_thoughts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES focus_sessions(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'idea' CHECK (category IN ('urgent_later', 'idea', 'random')),
    converted_to_task BOOLEAN NOT NULL DEFAULT FALSE,
    converted_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parked_thoughts_session ON parked_thoughts(session_id);
CREATE INDEX IF NOT EXISTS idx_parked_thoughts_converted ON parked_thoughts(converted_to_task);

-- Trigger for parked_thoughts updated_at
CREATE TRIGGER update_parked_thoughts_updated_at
BEFORE UPDATE ON parked_thoughts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. Session Friction Category and Pomodoro Cycle Tracking
ALTER TABLE focus_sessions
ADD COLUMN IF NOT EXISTS friction_category TEXT NOT NULL DEFAULT 'none'
CHECK (friction_category IN ('none', 'fatigue', 'interruption', 'scope_creep', 'complexity', 'unclear', 'other'));

ALTER TABLE focus_sessions
ADD COLUMN IF NOT EXISTS cycle_number INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_sessions_friction ON focus_sessions(friction_category);

