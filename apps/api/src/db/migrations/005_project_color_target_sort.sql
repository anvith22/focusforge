-- Add color + target_date to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3b82f6';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_date DATE;

-- Add sort_order to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Backfill sort_order based on creation order per project
UPDATE tasks t
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC) as rn
  FROM tasks
) sub
WHERE t.id = sub.id;

