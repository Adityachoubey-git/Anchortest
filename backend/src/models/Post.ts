import { Schema, model, Document, Types } from 'mongoose';

export interface IPost extends Document {
  title: string;
  body: string;
  author: Types.ObjectId;
  imageUrl?: string;
  videoUrl?: string;
  likes: Types.ObjectId[];
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true, index: true },
    body: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    imageUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const PostModel = model<IPost>('Post', PostSchema);
export default PostModel;
