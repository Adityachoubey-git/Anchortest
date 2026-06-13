import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { postRepository } from '../repositories/PostRepository';
import { commentRepository } from '../repositories/CommentRepository';
import { AuthRequest } from '../middleware/auth';

export class PostController {
  createPost = async (req: AuthRequest, res: Response) => {
    try {
      const { title, body } = req.body;
      if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
      }

      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageUrl = files?.['image']?.[0] ? `/uploads/${files['image'][0].filename}` : '';
      const videoUrl = files?.['video']?.[0] ? `/uploads/${files['video'][0].filename}` : '';

      const post = await postRepository.create({
        title,
        body,
        author: req.user.id as any,
        imageUrl,
        videoUrl,
      });

      return res.status(201).json({ message: 'Post created successfully', post });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  getPosts = async (req: any, res: Response) => {
    try {
      const posts = await postRepository.findAll();
      return res.status(200).json({ posts });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  getPostById = async (req: any, res: Response) => {
    try {
      const post = await postRepository.findByIdWithAuthor(req.params.id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      post.views = (post.views || 0) + 1;
      await postRepository.save(post);
      return res.status(200).json({ post });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  updatePost = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, body, removeImage, removeVideo } = req.body;

      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const post = await postRepository.findById(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.author.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (title !== undefined) post.title = title;
      if (body !== undefined) post.body = body;

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      if (removeImage === 'true' || removeImage === true) {
        if (post.imageUrl) {
          const oldPath = path.join(__dirname, '../../', post.imageUrl);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        post.imageUrl = '';
      } else if (files?.['image']?.[0]) {
        if (post.imageUrl) {
          const oldPath = path.join(__dirname, '../../', post.imageUrl);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        post.imageUrl = `/uploads/${files['image'][0].filename}`;
      }

      if (removeVideo === 'true' || removeVideo === true) {
        if (post.videoUrl) {
          const oldPath = path.join(__dirname, '../../', post.videoUrl);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        post.videoUrl = '';
      } else if (files?.['video']?.[0]) {
        if (post.videoUrl) {
          const oldPath = path.join(__dirname, '../../', post.videoUrl);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        post.videoUrl = `/uploads/${files['video'][0].filename}`;
      }

      await postRepository.save(post);
      return res.status(200).json({ message: 'Post updated successfully', post });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  deletePost = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const post = await postRepository.findById(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.author.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (post.imageUrl) {
        const imgPath = path.join(__dirname, '../../', post.imageUrl);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }
      if (post.videoUrl) {
        const vidPath = path.join(__dirname, '../../', post.videoUrl);
        if (fs.existsSync(vidPath)) fs.unlinkSync(vidPath);
      }

      await commentRepository.deleteManyByPost(id);
      await postRepository.deleteOne(id);

      return res.status(200).json({ message: 'Post and comments deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  likePost = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const post = await postRepository.findById(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const userId = req.user.id;
      const likeIndex = post.likes.indexOf(userId as any);

      if (likeIndex > -1) {
        post.likes.splice(likeIndex, 1);
      } else {
        post.likes.push(userId as any);
      }

      await postRepository.save(post);
      return res.status(200).json({ message: 'Success', likes: post.likes });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };
}

export const postController = new PostController();
