import { PostModel, IPost } from '../models/Post';
import { ClientSession } from 'mongoose';

export class PostRepository {
  async create(postData: Partial<IPost>): Promise<IPost> {
    const post = new PostModel(postData);
    return post.save();
  }

  async findAll(): Promise<IPost[]> {
    return PostModel.find()
      .populate('author', 'name email totalCredits')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string, session?: ClientSession): Promise<IPost | null> {
    const query = PostModel.findById(id);
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findByIdWithAuthor(id: string): Promise<IPost | null> {
    return PostModel.findById(id)
      .populate('author', 'name email totalCredits')
      .exec();
  }

  async findByAuthor(authorId: string): Promise<IPost[]> {
    return PostModel.find({ author: authorId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async save(post: IPost, session?: ClientSession): Promise<IPost> {
    if (session) {
      return post.save({ session });
    }
    return post.save();
  }

  async deleteOne(id: string, session?: ClientSession): Promise<void> {
    const query = PostModel.deleteOne({ _id: id });
    if (session) {
      query.session(session);
    }
    await query.exec();
  }
}

export const postRepository = new PostRepository();
