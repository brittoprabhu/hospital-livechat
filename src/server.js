import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { ENV } from './config/index.js';
//import { createPool } from './db/pool.js';
import { getPool } from './db/pool.js'; // or '../db/pool.js' depending on location

import PublicRoutes from './routes/public.js';
import AgentRoutes from './routes/agent.js';
import AdminRoutes from './routes/admin.js';
import UploadRoutes from './routes/uploads.js';

import { socketHandlers } from './sockets/index.js';
import { authLimiter } from './middleware/rateLimiters.js';
import botRouter from './routes/bot.js';

import { loadDepartments } from './config/index.js';
import { initializeFaqs } from './services/faqService.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const app = express();
app.set('trust proxy', true);

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// global middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// static
app.use('/uploads', express.static(path.join(ROOT, 'uploads')));
app.use(express.static(path.join(ROOT, 'public')));
const pool = getPool();
//const departments = await loadDepartments(); // valid only if top-level await is supported (Node.js 14+ with "type": "module")
//console.log('[INIT] botRouter result:', bot);
const departments = await loadDepartments();
console.log('[DEBUG] Departments loaded:', departments);
await initializeFaqs();

// DEBUG: Check values before using them
console.log('[DEBUG] Departments loaded:', departments);
console.log('[DEBUG] Pool OK:', !!pool);
console.log('[DEBUG] IO OK:', !!io);

//app.use('/bot', botRouter({ pool, io, departments }));
// db init + migrations
// Initialize botRouter
const bot = botRouter({ pool, io, departments });
console.log('[DEBUG] botRouter result is valid:', !!bot);

app.use('/bot', bot); // ✅ This tells Express to mount the router

//const pool = createPool();
const check = await pool.query('SELECT 1 as ok');
console.log('DB OK?', check.rows[0].ok === 1);

await (async () => {
  const c = await pool.connect();
  await c.query('SELECT 1');
  c.release();
})();
//await runMigrations(pool);

// rate limiter specifically on agent login (to keep JSON errors)
app.use('/api/agents/login', authLimiter);

console.log('[DEBUG] PublicRoutes is router:', typeof PublicRoutes?.use === 'function');
console.log('[DEBUG] AgentRoutes is router:', typeof AgentRoutes(pool)?.use === 'function');
console.log('[DEBUG] AdminRoutes is router:', typeof AdminRoutes(pool)?.use === 'function');
console.log('[DEBUG] UploadRoutes is router:', typeof UploadRoutes(pool, ROOT)?.use === 'function');


// routes

app.use(PublicRoutes);

app.use(AgentRoutes(pool));
app.use(AdminRoutes(pool));
app.use(UploadRoutes(pool, ROOT));
console.log('all routes loaded');


// sockets
socketHandlers(io, pool);

// start
server.listen(ENV.PORT, () => {
  console.log(`Server listening on port ${ENV.PORT}`);
});
