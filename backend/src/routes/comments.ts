import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { PostModel } from '../models/Post';
import { CommentModel } from '../models/Comment';
import { UserModel } from '../models/User';
import { CreditConfigurationModel } from '../models/CreditConfiguration';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET ALL COMMENTS FOR A POST (FLAT FEED SORTED BY CREATEDAT)
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const comments = await CommentModel.find({ post: req.params.postId })
      .populate('author', 'name email totalCredits')
      .sort({ createdAt: 1 });

    // Sanitize soft-deleted comments: mask body and author
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
});

// CREATE COMMENT UNDER A POST OR REPLY TO AN EXISTING COMMENT
router.post('/posts/:postId/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const { body, parentCommentId } = req.body;
  const authorId = req.user?.id;

  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'Comment body is required' });
  }

  if (!authorId) return res.status(401).json({ error: 'Unauthorized' });

  // Resilient implementation that uses transactions if available, otherwise falls back
  const session = await mongoose.startSession().catch(() => null);
  
  const executeCreation = async (useSession: boolean) => {
    const opts = useSession && session ? { session } : {};

    // 1. Fetch Post and identify the OP
    const post = await PostModel.findById(postId).setOptions(opts);
    if (!post) {
      throw new Error('Post not found');
    }
    const opId = post.author;

    let depth = 1;
    let ancestors: mongoose.Types.ObjectId[] = [];

    // 2. Resolve parent comment hierarchy
    if (parentCommentId) {
      const parent = await CommentModel.findById(parentCommentId).setOptions(opts);
      if (!parent) {
        throw new Error('Parent comment not found');
      }
      if (parent.isDeleted) {
        throw new Error('Cannot reply to a deleted comment');
      }
      depth = parent.depth + 1;
      ancestors = [...parent.ancestors, parent._id];
    }

    // 3. Dynamic Credit Reward Calculation
    let creditsToAward = 0;

    // OPs do not earn credits for their own comments
    if (authorId !== opId.toString()) {
      const activeConfig = await CreditConfigurationModel.findOne({ isActive: true }).setOptions(opts);
      if (activeConfig) {
        if (activeConfig.progressionType === 'ARITHMETIC') {
          const { startValue, commonDifference } = activeConfig.arithmeticConfig;
          creditsToAward = startValue + (depth - 1) * commonDifference;
        } else if (activeConfig.progressionType === 'CUSTOM_MAP') {
          const depthKey = depth.toString();
          let mappedCredits = activeConfig.customMap.get(depthKey);
          
          if (mappedCredits === undefined) {
            // Dynamically extrapolate progression if depth exceeds customMap bounds
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
        // Fallback default progression if config is not seeded: 1, 3, 5, 7
        creditsToAward = 1 + (depth - 1) * 2;
      }
    }

    // 4. Create and Save Comment
    const newComment = new CommentModel({
      post: postId,
      parentComment: parentCommentId || null,
      ancestors,
      author: authorId,
      body,
      depth,
      creditsAwarded: creditsToAward
    });
    await newComment.save(opts);

    // 5. Update OP credits atomically
    if (creditsToAward > 0) {
      await UserModel.updateOne(
        { _id: opId },
        { $inc: { totalCredits: creditsToAward } }
      ).setOptions(opts);
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
        // Fallback to non-transaction if transaction is unsupported
        if (err.message?.includes('replica set') || err.codeName === 'TransactionOutcomeUnknown' || err.message?.includes('sessions')) {
          console.warn('MongoDB standalone detected. Falling back to non-transactional database updates.');
          const result = await executeCreation(false);
          return res.status(201).json(result);
        }
        throw err;
      }
    } else {
      // Direct update when sessions are unavailable
      const result = await executeCreation(false);
      return res.status(201).json(result);
    }
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// SOFT DELETE COMMENT & REVERSE CREDITS FROM OP
router.delete('/comments/:commentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { commentId } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const session = await mongoose.startSession().catch(() => null);

  const executeDeletion = async (useSession: boolean) => {
    const opts = useSession && session ? { session } : {};

    const comment = await CommentModel.findById(commentId).setOptions(opts);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Verify ownership (only the author of the comment can delete it)
    if (comment.author?.toString() !== userId) {
      throw new Error('Unauthorized deletion request');
    }

    if (comment.isDeleted) {
      throw new Error('Comment already deleted');
    }

    // 1. Fetch Post to identify the OP
    const post = await PostModel.findById(comment.post).setOptions(opts);
    if (!post) {
      throw new Error('Associated post not found');
    }
    const opId = post.author;

    // 2. Retrieve historical credits to reverse
    const deduction = comment.creditsAwarded;

    // 3. Update comment status to isDeleted
    comment.isDeleted = true;
    comment.body = '[deleted]';
    await comment.save(opts);

    // 4. Reverse OP credits (floor user balance to 0)
    if (deduction > 0) {
      const op = await UserModel.findById(opId).setOptions(opts);
      if (op) {
        const newCredits = Math.max(0, op.totalCredits - deduction);
        await UserModel.updateOne(
          { _id: opId },
          { $set: { totalCredits: newCredits } }
        ).setOptions(opts);
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
        // Fallback to non-transaction if transaction is unsupported
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
});

export default router;
