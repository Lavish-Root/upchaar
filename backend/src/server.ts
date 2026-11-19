import http from 'http';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { checkDatabaseConnection, prisma } from './config/database';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { setupConsultationSockets } from './sockets/consultationSocket';

const app: Express = express();
const server = http.createServer(app);

// 1. Core Security & Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps or curl) or matching origins
      if (!origin || config.corsOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(null, true); // Dev flexible
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// 2. Global Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP address, please try again after 15 minutes.',
    },
  },
});
app.use('/api', limiter);

// 3. Static Uploads Directory
const uploadsDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

// 4. API Routes
app.use('/api/v1', apiRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    platform: 'PraanSewa Healthcare Management Platform',
    status: 'ONLINE',
    version: '1.0.0',
    documentation: '/api/v1/health',
  });
});

// 5. Centralized Error Handler
app.use(errorHandler);

// 6. Socket.IO Setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

setupConsultationSockets(io);

// 7. Server Initialization
async function startServer() {
  await checkDatabaseConnection();

  server.listen(config.port, () => {
    console.log(`🚀 PraanSewa Server running on http://localhost:${config.port}`);
    console.log(`🩺 API Base: http://localhost:${config.port}/api/v1`);
    console.log(`🔌 Socket.IO Consultation Rooms active`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Fatal server startup error:', err);
  });
}

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Closing HTTP server and database connections.');
  await prisma.$disconnect();
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

export { app, server };
