import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { ENV } from './config/index.js';
import { createPool } from './db/pool.js';
import { runMigrations } from './db/migrations.js';

import PublicRoutes from './routes/public.js';
import AgentRoutes from './routes/agent.js';
import AdminRoutes from './routes/admin.js';
import UploadRoutes from './routes/uploads.js';

import { socketHandlers } from './sockets/index.js';
import { authLimiter } from './middleware/rateLimiters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// global middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// static
app.use('/uploads', express.static(path.join(ROOT, 'uploads')));
app.use(express.static(path.join(ROOT, 'public')));

// db init + migrations
const pool = createPool();
await (async () => {
  const c = await pool.connect();
  await c.query('SELECT 1');
  c.release();
})();
await runMigrations(pool);

// rate limiter specifically on agent login (to keep JSON errors)
app.use('/api/agents/login', authLimiter);

// routes
app.use(PublicRoutes);
app.use(AgentRoutes(pool));
app.use(AdminRoutes(pool));
app.use(UploadRoutes(pool, ROOT));

// sockets
socketHandlers(io, pool);

// start
server.listen(ENV.PORT, () => {
  console.log(`Server listening on port ${ENV.PORT}`);
});
