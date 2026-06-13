import { Schema, model, Document, Types } from 'mongoose';

export interface IComment extends Document {
  post: Types.ObjectId;
  parentComment: Types.ObjectId | null;
  ancestors: Types.ObjectId[];
  author: Types.ObjectId | null;
  body: string;
  depth: number;
  isDeleted: boolean;
  creditsAwarded: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    parentComment: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    ancestors: [{ type: Schema.Types.ObjectId, ref: 'Comment', index: true }],
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    depth: { type: Number, required: true, min: 1 },
    isDeleted: { type: Boolean, default: false },
    creditsAwarded: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CommentSchema.index({ post: 1, createdAt: 1 });

export const CommentModel = model<IComment>('Comment', CommentSchema);
export default CommentModel;
