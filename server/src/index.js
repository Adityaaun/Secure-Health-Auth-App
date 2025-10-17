import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { verifyJWT } from './utils/jwt.js';

import { connectDB } from './config/db.js';
import { authLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';

import authRoutes from './routes/auth.js';
import twofaRoutes from './routes/twofa.js';
import adminRoutes from './routes/admin.js';
import apiRoutes from './routes/api.js';
import passwordResetRoutes from './routes/passwordReset.js';

dotenv.config();
const app = express();

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  console.log(`WebSocket client connected: ${socket.id}`);

  socket.on('authenticate', (data) => {
    try {
      if (!data || !data.token) return;
      const payload = verifyJWT(data.token, process.env.JWT_SECRET);
      if (payload && payload.role === 'admin') {
        socket.join('admins');
        console.log(`Admin user ${payload.email} joined the admins room.`);
      }
    } catch (error) {
      console.log('WebSocket authentication failed.');
    }
  });

  socket.on('disconnect', () => {
    console.log(`WebSocket client disconnected: ${socket.id}`);
  });
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http://localhost:4000"],
      frameSrc: ["'self'", "https://www.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/2fa', authLimiter, twofaRoutes);
app.use('/api/admin', authLimiter, adminRoutes);
app.use('/api/reset', authLimiter, passwordResetRoutes);
app.use('/api', apiRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
connectDB(process.env.MONGO_URI).then(() => {
  httpServer.listen(PORT, () => console.log(`Server listening on ${PORT}`));
});