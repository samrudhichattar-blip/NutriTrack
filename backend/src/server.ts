import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db/pool';
import { productsRouter } from './routes/products';
import { authRouter } from './routes/auth';
import { profileRouter } from './routes/profile';
import { goalsRouter } from './routes/goals';
import { basketRouter } from './routes/basket';
import { plannerRouter } from './routes/planner';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected' });
  } catch {
    return res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/basket', basketRouter);
app.use('/api/products', productsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`NutriTrack API listening on http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
