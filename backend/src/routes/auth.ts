import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool';
import type { PoolClient } from 'pg';
import { requireAuth, type AuthRequest } from '../middleware/auth';

export const authRouter = Router();

const signupSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.email().trim().max(254),
  password: z.string().min(8).max(72)
});
const loginSchema = z.object({
  username: z.string().trim().min(3).max(24),
  password: z.string().min(1).max(72)
});

function issueToken(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  return jwt.sign({}, secret, { subject: userId, expiresIn: '7d', algorithm: 'HS256' });
}

authRouter.post('/signup', async (req, res, next) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter your name, username, valid email and password of at least 8 characters.' });
  }

  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    const { displayName, username, email, password } = parsed.data;
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await client.query(
      `INSERT INTO users(email, username, display_name, password_hash)
       VALUES($1, $2, $3, $4)
       RETURNING id, email, username, display_name`,
      [email.toLowerCase(), username.toLowerCase(), displayName, passwordHash]
    );

    const user = inserted.rows[0];
    await client.query('INSERT INTO user_profiles(user_id) VALUES($1)', [user.id]);
    await client.query('INSERT INTO baskets(user_id) VALUES($1)', [user.id]);
    await client.query('COMMIT');

    return res.status(201).json({
      token: issueToken(user.id),
      user: { id: user.id, email: user.email, username: user.username, displayName: user.display_name }
    });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'That email address or username is already registered.' });
    }
    return next(error);
  } finally {
    client?.release();
  }
});

authRouter.post('/login', async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter your username and password.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, username, display_name, password_hash FROM users WHERE username = $1',
      [parsed.data.username.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }

    return res.json({
      token: issueToken(user.id),
      user: { id: user.id, email: user.email, username: user.username, displayName: user.display_name }
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.username, u.display_name, p.date_of_birth,
              p.dietary_preferences, p.allergies
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        username: user.username,
        dateOfBirth: user.date_of_birth,
        dietaryPreferences: user.dietary_preferences || [],
        allergies: user.allergies || []
      }
    });
  } catch (error) {
    return next(error);
  }
});
