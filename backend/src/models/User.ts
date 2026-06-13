import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  totalCredits: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    totalCredits: {
      type: Number,
      default: 0,
      min: [0, 'Credits cannot be negative'],
    },
  },
  { timestamps: true }
);

export const UserModel = model<IUser>('User', UserSchema);
export default UserModel;
