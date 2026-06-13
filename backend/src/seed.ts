import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CreditConfigurationModel } from './models/CreditConfiguration';
import { UserModel } from './models/User';
import { PostModel } from './models/Post';
import { CommentModel } from './models/Comment';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/anchor-forum';

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding.');

    // Clear all data
    await UserModel.deleteMany({});
    await PostModel.deleteMany({});
    await CommentModel.deleteMany({});
    await CreditConfigurationModel.deleteMany({});
    console.log('Cleared existing data.');

    // Seed configurations
    const arithmeticConfig = new CreditConfigurationModel({
      name: 'Standard Arithmetic (1, 3, 5, 7)',
      progressionType: 'ARITHMETIC',
      arithmeticConfig: {
        startValue: 1,
        commonDifference: 2,
      },
      isActive: true,
    });
    await arithmeticConfig.save();

    const customConfig = new CreditConfigurationModel({
      name: 'Custom Progression Mapping',
      progressionType: 'CUSTOM_MAP',
      customMap: {
        '1': 2,
        '2': 4,
        '3': 8,
        '4': 16
      },
      isActive: false,
    });
    await customConfig.save();

    console.log('Database seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

seed();
