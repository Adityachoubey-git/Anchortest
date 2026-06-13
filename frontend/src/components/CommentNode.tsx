import React, { useState } from 'react';
import { MessageSquare, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

export interface CommentData {
  _id: string;
  body: string;
  author: { _id: string; name: string } | null;
  depth: number;
  isDeleted: boolean;
  creditsAwarded: number;
  replies?: CommentData[];
}

interface CommentNodeProps {
  comment: CommentData;
  currentUserId: string;
  onAddReply: (parentId: string, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  maxIndentLevel?: number;
}

export const CommentNode: React.FC<CommentNodeProps> = ({
  comment,
  currentUserId,
  onAddReply,
  onDeleteComment,
  maxIndentLevel = 5,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      await onAddReply(comment._id, replyText);
      setReplyText('');
      setIsReplying(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reply');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment? This will reverse the credits awarded to the OP.')) {
      setLoading(true);
      try {
        await onDeleteComment(comment._id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete comment');
      } finally {
        setLoading(false);
      }
    }
  };

  // Determine spacing offset
  const hasChildren = comment.replies && comment.replies.length > 0;
  const isAuthor = comment.author && comment.author._id === currentUserId;

  return (
    <div className="mt-4 flex flex-col w-full">
      <div className="flex gap-3 items-start relative">

        <div className="w-[2px] bg-slate-200 absolute top-7 bottom-0 left-3" />


        <div className="z-10 mt-1">
          {hasChildren ? (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-350 hover:bg-slate-50 transition-all select-none shadow-sm"
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            </div>
          )}
        </div>


        <div className="flex-1 min-w-0">

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
            <span className={`font-semibold ${comment.isDeleted ? 'text-slate-400 italic opacity-60' : 'text-slate-850'}`}>
              {comment.isDeleted ? '[deleted]' : comment.author?.name || 'Anonymous'}
            </span>
            <span>•</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60 font-medium">
              Depth {comment.depth}
            </span>
            {!comment.isDeleted && comment.creditsAwarded > 0 && (
              <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-medium">
                +{comment.creditsAwarded} OP Credits
              </span>
            )}
            {isAuthor && !comment.isDeleted && (
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                You
              </span>
            )}
          </div>

          <div className={`text-sm p-3 rounded-xl border transition-all ${comment.isDeleted
              ? 'bg-slate-100/40 border-slate-200 text-slate-400 italic'
              : 'bg-slate-50 border-slate-200/60 text-slate-800'
            }`}>
            <p className="whitespace-pre-line leading-relaxed">
              {comment.isDeleted ? '[This comment has been deleted]' : comment.body}
            </p>
          </div>


          <div className="flex gap-4 mt-1.5 px-1">
            <button
              onClick={() => { if (!comment.isDeleted) setIsReplying(!isReplying); }}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${comment.isDeleted
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-500 hover:text-orange-600'
                }`}
              disabled={comment.isDeleted || loading}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Reply
            </button>

            {(isAuthor || comment.isDeleted) && (
              <button
                onClick={handleDelete}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ml-auto ${comment.isDeleted
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-500 hover:text-red-500'
                  }`}
                disabled={comment.isDeleted || loading}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>

          {isReplying && (
            <div className="mt-3 flex flex-col gap-2 p-3 bg-slate-100/70 rounded-xl border border-slate-200">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 placeholder-slate-400 transition-all resize-none"
                placeholder={`Replying to ${comment.author?.name}...`}
                rows={2}
                disabled={loading}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsReplying(false)}
                  className="px-3 py-1.5 text-xs bg-white text-slate-500 rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReplySubmit}
                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:opacity-90 font-medium transition shadow-md shadow-orange-500/10"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


      {!isCollapsed && comment.replies && comment.replies.length > 0 && (
        <div className={`space-y-1 ${comment.depth < maxIndentLevel ? 'ml-6' : 'ml-2 border-l border-slate-200 pl-2'}`}>
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply._id}
              comment={reply}
              currentUserId={currentUserId}
              onAddReply={onAddReply}
              onDeleteComment={onDeleteComment}
              maxIndentLevel={maxIndentLevel}
            />
          ))}
        </div>
      )}
    </div>
  );
};
export default CommentNode;
