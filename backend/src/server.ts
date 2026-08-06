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
  restaurantNameChangeRoutes
} from './routes';
import uploadRoutes from './routes/uploadRoutes';

// Load env vars
dotenv.config();

// Connect to database and assign permanent IDs to legacy restaurant records.
import { backfillRestaurantIdentities } from './services/restaurantIdentityService';
connectDB().then(() => backfillRestaurantIdentities().catch(error => console.error('Restaurant ID backfill failed:', error)));

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
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
import { activateDueCampaigns } from './services/campaignService';
setInterval(() => activateDueCampaigns().catch(console.error), 60000).unref();
activateDueCampaigns().catch(console.error);

app.listen(PORT, () => {
  console.log(`
  HalkaBite Server
  ══════════════════════════════════════
  Server running on port ${PORT}
   Environment: ${process.env.NODE_ENV || 'development'}
   API: http://localhost:${PORT}/api
  ═══════════════════════════════════════
  `);
});

export default app;
