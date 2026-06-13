import React, { useState, useEffect } from 'react';
import { Plus, ArrowRight, User as UserIcon, Image as ImageIcon, Video as VideoIcon, X, Heart, Eye } from 'lucide-react';

export interface Post {
  _id: string;
  title: string;
  body: string;
  author: { _id: string; name: string; email: string; totalCredits: number };
  imageUrl?: string;
  videoUrl?: string;
  likes?: string[];
  views?: number;
  createdAt: string;
}

interface DashboardProps {
  onSelectPost: (postId: string) => void;
  onRefreshCredits: () => void;
  currentUserId: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectPost, onRefreshCredits, currentUserId }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [videoPreview, setVideoPreview] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (res.ok) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview('');
  };

  const handleLikePost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to like post');


      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: data.likes } : p));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error liking post');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostBody.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', newPostTitle);
      formData.append('body', newPostBody);
      if (imageFile) formData.append('image', imageFile);
      if (videoFile) formData.append('video', videoFile);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create post');

      setNewPostTitle('');
      setNewPostBody('');
      handleRemoveImage();
      handleRemoveVideo();
      fetchPosts();
      onRefreshCredits();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      <div className="glass-card rounded-2xl p-6 border-slate-200/90 shadow-md shadow-slate-100 bg-white">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 tracking-wide border-b border-slate-100 pb-3">
          <Plus className="w-5 h-5 text-orange-500" />
          Create Discussion Thread
        </h2>
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <input
              type="text"
              required
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 placeholder-slate-400 transition"
              placeholder="What is the topic of discussion?"
              disabled={submitting}
            />
          </div>
          <div>
            <textarea
              required
              value={newPostBody}
              onChange={(e) => setNewPostBody(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 placeholder-slate-400 transition resize-none"
              placeholder="Elaborate on your topic..."
              rows={3}
              disabled={submitting}
            />
          </div>


          {(imagePreview || videoPreview) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-150">
              {imagePreview && (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-48 bg-white flex items-center justify-center">
                  <img src={imagePreview} alt="Upload preview" className="max-h-48 object-contain w-full" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {videoPreview && (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-48 bg-white flex items-center justify-center">
                  <video src={videoPreview} controls className="max-h-48 object-contain w-full" />
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}


          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-lg cursor-pointer transition select-none">
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                <span>Add Image</span>
                <input
                  key={imageFile ? 'image-selected' : 'image-empty'}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={submitting}
                />
              </label>

              <label className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-lg cursor-pointer transition select-none">
                <VideoIcon className="w-4 h-4 text-blue-500" />
                <span>Add Video</span>
                <input
                  key={videoFile ? 'video-selected' : 'video-empty'}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                  disabled={submitting}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white text-xs font-bold rounded-xl transition shadow-md shadow-orange-500/10 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post Thread'}
            </button>
          </div>
        </form>
      </div>


      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-950 px-1 tracking-tight">Active Discussions</h2>

        {loading && posts.length === 0 ? (
          <div className="text-center py-10 text-slate-450 text-sm font-semibold">Loading feed...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 bg-white rounded-2xl text-slate-450 text-sm">
            No active discussions yet. Create the first thread above!
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post._id}
              onClick={() => onSelectPost(post._id)}
              className="glass-card rounded-2xl p-6 border-slate-200/90 hover:border-orange-500/35 hover:bg-slate-50/50 cursor-pointer group transition-all duration-300 bg-white"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2.5 min-w-0 flex-1">
                  <h3 className="font-bold text-base text-slate-900 tracking-wide group-hover:text-orange-600 transition-colors truncate">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {post.body}
                  </p>


                  {(post.imageUrl || post.videoUrl) && (
                    <div className="flex gap-2.5 pt-1">
                      {post.imageUrl && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200/60 bg-slate-100 flex-shrink-0 flex items-center justify-center">
                          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      {post.videoUrl && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200/60 bg-slate-100 flex-shrink-0 flex items-center justify-center relative">
                          <video src={post.videoUrl} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                            <VideoIcon className="w-3.5 h-3.5 text-white drop-shadow-md" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200/80 group-hover:bg-orange-500/10 group-hover:border-orange-500/30 transition-all flex-shrink-0">
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-all" />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 font-medium text-slate-600">
                    <UserIcon className="w-3 h-3 text-slate-400" />
                    <span>{post.author?.name}</span>
                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px] border border-slate-200/50">
                      OP ({post.author?.totalCredits} Credits)
                    </span>
                  </div>


                  <button
                    onClick={(e) => handleLikePost(e, post._id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all ${post.likes?.includes(currentUserId)
                        ? 'bg-red-50 border-red-200 text-red-500 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-red-50 hover:border-red-100 hover:text-red-500'
                      }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${post.likes?.includes(currentUserId) ? 'fill-red-500 text-red-500' : ''}`} />
                    <span>{post.likes?.length || 0}</span>
                  </button>


                  {currentUserId && post.author?._id === currentUserId && (
                    <div className="flex items-center gap-1 text-slate-500 font-medium px-2 py-1 bg-slate-50 border border-slate-200 rounded-full">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{post.views || 0} Views</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default Dashboard;
