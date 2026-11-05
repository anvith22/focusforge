import { pool, testConnection, closePool } from '../pool.js';

export async function seed() {
  console.log('🌱 Starting database seed...');
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Database connection failed');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if sample project already exists
    const existingProject = await client.query(
      "SELECT id FROM projects WHERE name = 'FocusForge App' LIMIT 1"
    );

    let projectId: string;

    if (existingProject.rows.length === 0) {
      const projRes = await client.query(
        `INSERT INTO projects (name, description, status)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [
          'FocusForge App',
          'Personal anti-procrastination productivity system for after-work momentum',
          'active',
        ]
      );
      projectId = projRes.rows[0].id;
      console.log(` Created sample project: FocusForge App (${projectId})`);
    } else {
      projectId = existingProject.rows[0].id;
      console.log(`ℹ️ Project FocusForge App already exists (${projectId})`);
    }

    // Insert sample tasks
    const tasks = [
      {
        title: 'Review weekly focus targets & plan tomorrow',
        description: 'Set priority tasks and define next concrete steps',
        priority: 'high',
        status: 'todo',
      },
      {
        title: 'Complete 25-minute Deep Work sprint',
        description: 'Single-task with no phone or tab switching',
        priority: 'high',
        status: 'in_progress',
      },
      {
        title: 'Refactor focus timer state handling',
        description: 'Ensure accurate timestamp-based reconciliation on reload',
        priority: 'medium',
        status: 'done',
      },
    ];

    for (const task of tasks) {
      const taskCheck = await client.query(
        'SELECT id FROM tasks WHERE project_id = $1 AND title = $2 LIMIT 1',
        [projectId, task.title]
      );

      if (taskCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO tasks (project_id, title, description, status, priority, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            projectId,
            task.title,
            task.description,
            task.status,
            task.priority,
            task.status === 'done' ? new Date() : null,
          ]
        );
        console.log(` Created sample task: "${task.title}" [${task.status}]`);
      }
    }

    await client.query('COMMIT');
    console.log('🎉 Seed completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed error:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seed()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seed script failed:', err);
      await closePool();
      process.exit(1);
    });
}
