import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import journalRoutes from './routes/journal.js';
import settingsRoutes from './routes/settings.js';
import todoRoutes from './routes/todo.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/todos', todoRoutes);

if (process.env.NODE_ENV !== 'production') {
  const testRoutes = await import('./routes/test.js');
  app.use('/api/test', testRoutes.default);
}

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
