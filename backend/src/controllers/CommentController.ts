import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { commentRepository } from '../repositories/CommentRepository';
import { postRepository } from '../repositories/PostRepository';
import { userRepository } from '../repositories/UserRepository';
import { creditConfigRepository } from '../repositories/CreditConfigRepository';
import { AuthRequest } from '../middleware/auth';

export class CommentController {
  getComments = async (req: Request, res: Response) => {
    try {
      const comments = await commentRepository.findByPost(req.params.postId);

      const sanitizedComments = comments.map(c => {
        const doc = c.toObject();
        if (doc.isDeleted) {
          doc.body = '[This comment has been deleted]';
          doc.author = null;
        }
        return doc;
      });

      return res.status(200).json({ comments: sanitizedComments });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  createComment = async (req: AuthRequest, res: Response) => {
    const { postId } = req.params;
    const { body, parentCommentId } = req.body;
    const authorId = req.user?.id;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Comment body is required' });
    }

    if (!authorId) return res.status(401).json({ error: 'Unauthorized' });

    const session = await mongoose.startSession().catch(() => null);

    const executeCreation = async (useSession: boolean) => {
      const dbSession = useSession && session ? session : undefined;

      const post = await postRepository.findById(postId, dbSession);
      if (!post) {
        throw new Error('Post not found');
      }
      const opId = post.author;

      let depth = 1;
      let ancestors: mongoose.Types.ObjectId[] = [];

      if (parentCommentId) {
        const parent = await commentRepository.findById(parentCommentId, dbSession);
        if (!parent) {
          throw new Error('Parent comment not found');
        }
        if (parent.isDeleted) {
          throw new Error('Cannot reply to a deleted comment');
        }
        depth = parent.depth + 1;
        ancestors = [...parent.ancestors, parent._id];
      }

      let creditsToAward = 0;

      if (authorId !== opId.toString()) {
        const activeConfig = await creditConfigRepository.findActive(dbSession);
        if (activeConfig) {
          if (activeConfig.progressionType === 'ARITHMETIC') {
            const { startValue, commonDifference } = activeConfig.arithmeticConfig;
            creditsToAward = startValue + (depth - 1) * commonDifference;
          } else if (activeConfig.progressionType === 'CUSTOM_MAP') {
            const depthKey = depth.toString();
            let mappedCredits = activeConfig.customMap.get(depthKey);

            if (mappedCredits === undefined) {
              const keys = Array.from(activeConfig.customMap.keys()).map(Number).sort((a, b) => a - b);
              if (keys.length > 0) {
                const maxKey = keys[keys.length - 1];
                const maxVal = activeConfig.customMap.get(maxKey.toString()) || 1;

                if (keys.length >= 2) {
                  const prevKey = keys[keys.length - 2];
                  const prevVal = activeConfig.customMap.get(prevKey.toString()) || 1;
                  const diff = Math.max(1, maxVal - prevVal);
                  mappedCredits = maxVal + (depth - maxKey) * diff;
                } else {
                  mappedCredits = maxVal + (depth - maxKey) * 2;
                }
              } else {
                mappedCredits = 1 + (depth - 1) * 2;
              }
            }
            creditsToAward = mappedCredits;
          }
        } else {
          creditsToAward = 1 + (depth - 1) * 2;
        }
      }

      const newComment = await commentRepository.create({
        post: postId as any,
        parentComment: parentCommentId ? parentCommentId as any : null,
        ancestors,
        author: authorId as any,
        body,
        depth,
        creditsAwarded: creditsToAward
      }, dbSession);

      if (creditsToAward > 0) {
        await userRepository.incrementCredits(opId, creditsToAward, dbSession);
      }

      return { comment: newComment, creditsAwarded: creditsToAward };
    };

    try {
      if (session) {
        session.startTransaction();
        try {
          const result = await executeCreation(true);
          await session.commitTransaction();
          session.endSession();
          return res.status(201).json(result);
        } catch (err: any) {
          await session.abortTransaction();
          session.endSession();

          if (err.message?.includes('replica set') || err.codeName === 'TransactionOutcomeUnknown' || err.message?.includes('sessions')) {
            console.warn('MongoDB standalone detected. Falling back to non-transactional database updates.');
            const result = await executeCreation(false);
            return res.status(201).json(result);
          }
          throw err;
        }
      } else {
        const result = await executeCreation(false);
        return res.status(201).json(result);
      }
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };

  deleteComment = async (req: AuthRequest, res: Response) => {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const session = await mongoose.startSession().catch(() => null);

    const executeDeletion = async (useSession: boolean) => {
      const dbSession = useSession && session ? session : undefined;

      const comment = await commentRepository.findById(commentId, dbSession);
      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.author?.toString() !== userId) {
        throw new Error('Unauthorized deletion request');
      }

      if (comment.isDeleted) {
        throw new Error('Comment already deleted');
      }

      const post = await postRepository.findById(comment.post.toString(), dbSession);
      if (!post) {
        throw new Error('Associated post not found');
      }
      const opId = post.author;

      const deduction = comment.creditsAwarded;

      comment.isDeleted = true;
      comment.body = '[deleted]';
      await commentRepository.save(comment, dbSession);

      if (deduction > 0) {
        const op = await userRepository.findById(opId.toString(), dbSession);
        if (op) {
          const newCredits = Math.max(0, op.totalCredits - deduction);
          await userRepository.updateCredits(opId, newCredits, dbSession);
        }
      }

      return { message: 'Comment soft-deleted and credits reversed', reversedCredits: deduction };
    };

    try {
      if (session) {
        session.startTransaction();
        try {
          const result = await executeDeletion(true);
          await session.commitTransaction();
          session.endSession();
          return res.status(200).json(result);
        } catch (err: any) {
          await session.abortTransaction();
          session.endSession();

          if (err.message?.includes('replica set') || err.codeName === 'TransactionOutcomeUnknown' || err.message?.includes('sessions')) {
            console.warn('MongoDB standalone detected. Falling back to non-transactional database updates on deletion.');
            const result = await executeDeletion(false);
            return res.status(200).json(result);
          }
          throw err;
        }
      } else {
        const result = await executeDeletion(false);
        return res.status(200).json(result);
      }
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };
}

export const commentController = new CommentController();
