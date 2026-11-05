import { Request, Response, NextFunction } from 'express';
import { query } from '../../db/pool.js';
import { updateSettingsSchema } from './settings.schema.js';

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    let result = await query('SELECT * FROM user_settings WHERE id = $1', ['default']);
    if (result.rows.length === 0) {
      await query("INSERT INTO user_settings (id) VALUES ('default') ON CONFLICT DO NOTHING");
      result = await query('SELECT * FROM user_settings WHERE id = $1', ['default']);
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSettingsSchema.parse(req.body);
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        if (key === 'ambient_layers') {
          updates.push(`${key} = $${idx++}::jsonb`);
          values.push(JSON.stringify(val));
        } else {
          updates.push(`${key} = $${idx++}`);
          values.push(val);
        }
      }
    }

    if (updates.length === 0) {
      const current = await query('SELECT * FROM user_settings WHERE id = $1', ['default']);
      return res.json(current.rows[0]);
    }

    values.push('default');
    const sql = `
      UPDATE user_settings 
      SET ${updates.join(', ')} 
      WHERE id = $${idx} 
      RETURNING *
    `;

    const result = await query(sql, values);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

