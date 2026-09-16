import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

import connectDB from './config/db';
import { errorHandler } from './middleware/errorHandler';
import {
  authRoutes,
  foodRoutes,
  orderRoutes,
  cartRoutes,
  categoryRoutes,
  restaurantRoutes,
  userRoutes,
  aiRoutes,
  reviewRoutes,
  adminRoutes,
  deliveryRoutes,
  notificationRoutes,
  campaignRoutes,
  locationRoutes,
  restaurantNameChangeRoutes,
  chatRoutes,
  customerOrderNotificationRoutes,
  paymentRoutes
} from './routes';
import featuredFoodRoutes from './routes/featuredFoodRoutes';
import uploadRoutes from './routes/uploadRoutes';
import { apiRateLimit } from './middleware/rateLimit';
import { ensureRestaurantActivityIndexes } from './services/restaurantActivityService';
import { backfillRestaurantIdentities } from './services/restaurantIdentityService';
import { ensureFeaturedFoodIndex } from './services/featuredFoodService';
import { activateDueCampaigns } from './services/campaignService';

// Load env vars
dotenv.config();

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

let initializationPromise: Promise<void> | undefined;
const initializeApplication = () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await connectDB();
      await ensureRestaurantActivityIndexes();
      await backfillRestaurantIdentities();
      await ensureFeaturedFoodIndex();
      await activateDueCampaigns();
    })().catch(error => {
      initializationPromise = undefined;
      throw error;
    });
  }
  return initializationPromise;
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb', parameterLimit: 100 }));
app.use(cookieParser());
app.use(async (_req, _res, next) => {
  try {
    await initializeApplication();
    next();
  } catch (error) {
    next(error);
  }
});
app.use('/api', apiRateLimit);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/foods', featuredFoodRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/restaurant-name-change-requests', restaurantNameChangeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/customer-order-notifications', customerOrderNotificationRoutes);
app.use('/api/payments', paymentRoutes);

// Make uploads folder static
const rootDir = path.resolve();
app.use('/uploads', express.static(path.join(rootDir, '/uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'HalkaBite API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;
export const startServer = async () => {
  await initializeApplication();
  setInterval(() => activateDueCampaigns().catch(console.error), 60000).unref();
  return app.listen(PORT, () => {
    console.log(`
  HalkaBite Server
  ══════════════════════════════════════
  Server running on port ${PORT}
   Environment: ${process.env.NODE_ENV || 'development'}
   API: http://localhost:${PORT}/api
  ═══════════════════════════════════════
  `);
  });
};

if (require.main === module) {
  startServer().catch(error => {
    console.error('HalkaBite failed to start:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export default app;
