import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, CornerDownRight, User, Trash2, Edit3, Save, X, Image as ImageIcon, Video as VideoIcon, Heart, Eye } from 'lucide-react';
import { CommentNode, CommentData } from '../components/CommentNode';
import { Post } from './Dashboard';

interface PostDetailsProps {
  postId: string;
  currentUserId: string;
  onBack: () => void;
  onRefreshCredits: () => void;
}

export const PostDetails: React.FC<PostDetailsProps> = ({
  postId,
  currentUserId,
  onBack,
  onRefreshCredits,
}) => {
  const [post, setPost] = useState<Post | null>(null);
  const [flatComments, setFlatComments] = useState<CommentData[]>([]);
  const [commentTree, setCommentTree] = useState<CommentData[]>([]);
  const [rootCommentText, setRootCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>('');
  const [editVideoPreview, setEditVideoPreview] = useState<string>('');
  const [removeImage, setRemoveImage] = useState(false);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const buildTree = useCallback((comments: CommentData[]): CommentData[] => {
    const map: { [key: string]: CommentData & { replies: CommentData[] } } = {};
    const roots: CommentData[] = [];
    comments.forEach((c) => {
      map[c._id] = { ...c, replies: [] };
    });
    comments.forEach((c) => {
      const commentNode = map[c._id];
      const parentId = (c as any).parentComment;

      if (!parentId) {
        roots.push(commentNode);
      } else {
        const parentNode = map[parentId];
        if (parentNode) {
          parentNode.replies.push(commentNode);
        } else {
          roots.push(commentNode);
        }
      }
    });

    return roots;
  }, []);

  const fetchPostAndComments = useCallback(async () => {
    setLoading(true);
    try {
      const postRes = await fetch(`/api/posts/${postId}`);
      const postData = await postRes.json();
      if (postRes.ok) {
        setPost(postData.post);
        setEditTitle(postData.post.title);
        setEditBody(postData.post.body);
      }

      const commentsRes = await fetch(`/api/comments/posts/${postId}/comments`);
      const commentsData = await commentsRes.json();
      if (commentsRes.ok) {
        setFlatComments(commentsData.comments);
        setCommentTree(buildTree(commentsData.comments));
      }
    } catch (err) {
      console.error('Failed to load post/comments:', err);
    } finally {
      setLoading(false);
    }
  }, [postId, buildTree]);

  useEffect(() => {
    fetchPostAndComments();
  }, [fetchPostAndComments]);

  const handleAddRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootCommentText.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/comments/posts/${postId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: rootCommentText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit comment');

      setRootCommentText('');
      fetchPostAndComments();
      onRefreshCredits();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error submitting comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (parentCommentId: string, body: string) => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`/api/comments/posts/${postId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body, parentCommentId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit reply');

    fetchPostAndComments();
    onRefreshCredits();
  };

  const handleDeleteComment = async (commentId: string) => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`/api/comments/comments/${commentId}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete comment');

    fetchPostAndComments();
    onRefreshCredits();
  };

  const handleLikePost = async () => {
    if (!post) return;
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/posts/${post._id}/like`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to like post');

      setPost(prev => prev ? { ...prev, likes: data.likes } : null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error liking post');
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (window.confirm('Are you sure you want to delete this thread? All comments inside it will also be deleted.')) {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/posts/${post._id}`, {
          method: 'DELETE',
          headers,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete post');

        alert('Discussion thread successfully deleted!');
        onBack();
        onRefreshCredits();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error deleting post');
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;
    if (!editTitle.trim() || !editBody.trim()) return;

    setEditSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('body', editBody);
      formData.append('removeImage', String(removeImage));
      formData.append('removeVideo', String(removeVideo));

      if (editImageFile) {
        formData.append('image', editImageFile);
      }
      if (editVideoFile) {
        formData.append('video', editVideoFile);
      }

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/posts/${post._id}`, {
        method: 'PUT',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update post');

      setIsEditing(false);
      setEditImageFile(null);
      setEditVideoFile(null);
      setEditImagePreview('');
      setEditVideoPreview('');
      setRemoveImage(false);
      setRemoveVideo(false);
      fetchPostAndComments();
      onRefreshCredits();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating post');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditImageFile(file);
      setEditImagePreview(URL.createObjectURL(file));
      setRemoveImage(false);
    }
  };

  const handleEditVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditVideoFile(file);
      setEditVideoPreview(URL.createObjectURL(file));
      setRemoveVideo(false);
    }
  };

  if (loading && !post) {
    return <div className="text-center py-20 text-slate-500 font-semibold text-sm">Loading thread details...</div>;
  }

  if (!post) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl max-w-md mx-auto shadow-sm p-8">
        <p className="text-slate-500 mb-4 font-semibold text-sm">Post not found.</p>
        <button onClick={onBack} className="text-orange-600 font-bold flex items-center gap-1 mx-auto hover:underline text-sm">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const isAuthor = post.author && post.author._id === currentUserId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-orange-600 text-sm font-semibold py-1.5 transition select-none group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Discussions
      </button>


      {isEditing ? (
        <div className="glass-card rounded-2xl p-6 md:p-8 border-slate-200/90 shadow-lg bg-white">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base">Edit Discussion Thread</h3>
            <button
              onClick={() => {
                setIsEditing(false);
                setRemoveImage(false);
                setRemoveVideo(false);
              }}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Title</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition"
                placeholder="What is the topic of discussion?"
                disabled={editSubmitting}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Description</label>
              <textarea
                required
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition resize-none"
                placeholder="Elaborate on your topic..."
                rows={5}
                disabled={editSubmitting}
              />
            </div>


            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Media Management</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-slate-500">Image Asset</span>
                  {!removeImage && (editImagePreview || post.imageUrl) ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 h-32 bg-white flex items-center justify-center">
                      <img src={editImagePreview || post.imageUrl} alt="Edit preview" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => {
                          setEditImageFile(null);
                          setEditImagePreview('');
                          setRemoveImage(true);
                        }}
                        className="absolute top-1.5 right-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg h-32 cursor-pointer hover:bg-white hover:border-orange-500/55 transition select-none bg-slate-100/30">
                      <ImageIcon className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[11px] font-semibold text-slate-500">Upload new image</span>
                      <input
                        key={editImageFile ? 'edit-image-selected' : 'edit-image-empty'}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleEditImageChange}
                      />
                    </label>
                  )}
                </div>


                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-slate-500">Video Asset</span>
                  {!removeVideo && (editVideoPreview || post.videoUrl) ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 h-32 bg-white flex items-center justify-center">
                      <video src={editVideoPreview || post.videoUrl} className="h-full w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => {
                          setEditVideoFile(null);
                          setEditVideoPreview('');
                          setRemoveVideo(true);
                        }}
                        className="absolute top-1.5 right-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg h-32 cursor-pointer hover:bg-white hover:border-orange-500/55 transition select-none bg-slate-100/30">
                      <VideoIcon className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[11px] font-semibold text-slate-500">Upload new video</span>
                      <input
                        key={editVideoFile ? 'edit-video-selected' : 'edit-video-empty'}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleEditVideoChange}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setRemoveImage(false);
                  setRemoveVideo(false);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 text-xs font-bold transition"
                disabled={editSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white text-xs font-bold rounded-xl transition shadow-md shadow-orange-500/10"
                disabled={editSubmitting}
              >
                <Save className="w-3.5 h-3.5" />
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 md:p-8 border-slate-200/90 shadow-md bg-white">
          <div className="flex justify-between items-start gap-4 mb-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight flex-1">
              {post.title}
            </h1>


            {isAuthor && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors tooltip"
                  title="Edit post"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeletePost}
                  className="flex items-center justify-center p-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 hover:text-red-750 transition-colors tooltip"
                  title="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-450" />
              <span className="font-semibold text-slate-800">{post.author?.name}</span>
            </div>
            <span>•</span>
            <span>{new Date(post.createdAt).toLocaleString()}</span>
            <span>•</span>
            <span className="bg-orange-50 text-orange-700 font-bold border border-orange-100/50 px-2 py-0.5 rounded text-[10px]">
              OP ({post.author?.totalCredits} Credits)
            </span>


            <button
              onClick={handleLikePost}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all ${post.likes?.includes(currentUserId)
                ? 'bg-red-50 border-red-200 text-red-500 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-red-50 hover:border-red-100 hover:text-red-500'
                }`}
            >
              <Heart className={`w-3.5 h-3.5 ${post.likes?.includes(currentUserId) ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{post.likes?.length || 0} Likes</span>
            </button>

            {currentUserId && post.author?._id === currentUserId && (
              <div className="flex items-center gap-1 text-slate-500 font-semibold px-2 py-1 bg-slate-50 border border-slate-200 rounded-full">
                <Eye className="w-3.5 h-3.5" />
                <span>{post.views || 0} Views</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
              {post.body}
            </p>

            {post.imageUrl && (
              <div className="rounded-xl overflow-hidden max-h-[400px] border border-slate-200 bg-slate-50 flex items-center justify-center mt-4 p-1">
                <img src={post.imageUrl} alt={post.title} className="max-h-[390px] object-contain w-full rounded-lg" />
              </div>
            )}

            {post.videoUrl && (
              <div className="rounded-xl overflow-hidden max-h-[400px] border border-slate-200 bg-slate-50 flex items-center justify-center mt-4 p-1">
                <video src={post.videoUrl} controls className="max-h-[390px] object-contain w-full rounded-lg" />
              </div>
            )}
          </div>
        </div>
      )}


      <div className="glass-card rounded-2xl p-6 border-slate-200/90 bg-white">
        <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <CornerDownRight className="w-4 h-4 text-orange-500" />
          Join the Conversation
        </h2>
        <form onSubmit={handleAddRootComment} className="space-y-3">
          <textarea
            required
            value={rootCommentText}
            onChange={(e) => setRootCommentText(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 placeholder-slate-400 transition resize-none"
            placeholder="Write a comment..."
            rows={3}
            disabled={submitting}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white text-xs font-bold rounded-lg transition shadow-md shadow-orange-500/10 disabled:opacity-50 active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Submitting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </div>


      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-bold text-slate-950 px-1">
          Discussion ({flatComments.length} comments)
        </h3>

        {commentTree.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-250 bg-white rounded-2xl text-slate-450 text-xs">
            No comments yet. Start the discussion above!
          </div>
        ) : (
          <div className="space-y-2 pb-12">
            {commentTree.map((comment) => (
              <CommentNode
                key={comment._id}
                comment={comment}
                currentUserId={currentUserId}
                onAddReply={handleAddReply}
                onDeleteComment={handleDeleteComment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default PostDetails;
