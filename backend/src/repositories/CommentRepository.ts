import { CommentModel, IComment } from '../models/Comment';
import { ClientSession } from 'mongoose';

export class CommentRepository {
  async findByPost(postId: string): Promise<IComment[]> {
    return CommentModel.find({ post: postId })
      .populate('author', 'name email totalCredits')
      .sort({ createdAt: 1 })
      .exec();
  }

  async findById(id: string, session?: ClientSession): Promise<IComment | null> {
    const query = CommentModel.findById(id);
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async create(commentData: Partial<IComment>, session?: ClientSession): Promise<IComment> {
    const comment = new CommentModel(commentData);
    if (session) {
      await comment.save({ session });
    } else {
      await comment.save();
    }
    return comment;
  }

  async deleteManyByPost(postId: string, session?: ClientSession): Promise<void> {
    const query = CommentModel.deleteMany({ post: postId });
    if (session) {
      query.session(session);
    }
    await query.exec();
  }

  async findActiveByPosts(postIds: any[]): Promise<IComment[]> {
    return CommentModel.find({
      post: { $in: postIds },
      isDeleted: false,
      creditsAwarded: { $gt: 0 }
    }).exec();
  }

  async save(comment: IComment, session?: ClientSession): Promise<IComment> {
    if (session) {
      return comment.save({ session });
    }
    return comment.save();
  }
}

export const commentRepository = new CommentRepository();
