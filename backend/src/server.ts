import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import commentRoutes from './routes/comments';
import configRoutes from './routes/config';
import { CreditConfigurationModel } from './models/CreditConfiguration';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/anchor-forum';

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes); // Handles flat comment retrieval, replies, and deletions
app.use('/api/config', configRoutes);    // Admin configuration routes

// Root Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Anchor Forum API is running smoothly.' });
});

// Seed Initial Credit configuration if missing
const seedDefaultConfig = async () => {
  try {
    const configCount = await CreditConfigurationModel.countDocuments();
    if (configCount === 0) {
      console.log('No credit configurations found. Seeding default configuration...');
      const defaultConfig = new CreditConfigurationModel({
        name: 'Default Progression',
        progressionType: 'ARITHMETIC',
        arithmeticConfig: {
          startValue: 1,       // depth 1 = 1 point
          commonDifference: 2, // depth 2 = 3, depth 3 = 5
        },
        customMap: {
          '1': 1,
          '2': 3,
          '3': 5
        },
        isActive: true
      });
      await defaultConfig.save();
      console.log('Default Credit configuration seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding default credit configuration:', error);
  }
};

// Connect to Database and start server
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    await seedDefaultConfig();
    
    app.listen(PORT, () => {
      console.log(`Server is running in development mode on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
