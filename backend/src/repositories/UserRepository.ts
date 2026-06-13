import { UserModel, IUser } from '../models/User';
import { ClientSession } from 'mongoose';

export class UserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string, session?: ClientSession): Promise<IUser | null> {
    const query = UserModel.findById(id);
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findByIdWithoutPassword(id: string): Promise<IUser | null> {
    return UserModel.findById(id).select('-passwordHash').exec();
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    const user = new UserModel(userData);
    return user.save();
  }

  async incrementCredits(userId: string | any, amount: number, session?: ClientSession): Promise<void> {
    const query = UserModel.updateOne(
      { _id: userId },
      { $inc: { totalCredits: amount } }
    );
    if (session) {
      query.session(session);
    }
    await query.exec();
  }

  async updateCredits(userId: string | any, totalCredits: number, session?: ClientSession): Promise<void> {
    const query = UserModel.updateOne(
      { _id: userId },
      { $set: { totalCredits } }
    );
    if (session) {
      query.session(session);
    }
    await query.exec();
  }
}

export const userRepository = new UserRepository();
