import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, FileText, X, HelpCircle } from 'lucide-react';

interface PostCreditInfo {
  _id: string;
  title: string;
  createdAt: string;
  creditsEarned: number;
}

interface CreditsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  totalCredits: number;
}

export const CreditsPopup: React.FC<CreditsPopupProps> = ({ isOpen, onClose, totalCredits }) => {
  const [loading, setLoading] = useState(false);
  const [last10DaysCredits, setLast10DaysCredits] = useState<number>(0);
  const [postsCredits, setPostsCredits] = useState<PostCreditInfo[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      fetch('/api/auth/me/credits-history', { headers })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch credits history');
          return res.json();
        })
        .then((data) => {
          setLast10DaysCredits(data.last10DaysCredits);
          setPostsCredits(data.postsCredits);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">

      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transform scale-100 transition-all duration-300">


        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <Trophy className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg tracking-wide">Credit Engine Dashboard</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100/70 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-widest block leading-none mb-1.5">Total Balance</span>
                <span className="text-2xl font-extrabold text-slate-900 leading-none">{totalCredits.toLocaleString()} <span className="text-sm font-semibold text-slate-500">Credits</span></span>
              </div>
            </div>


            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-100/70 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest block leading-none mb-1.5">Last 10 Days</span>
                <span className="text-2xl font-extrabold text-slate-900 leading-none">
                  {loading ? '...' : `+${last10DaysCredits.toLocaleString()}`} <span className="text-sm font-semibold text-slate-550">Credits</span>
                </span>
              </div>
            </div>
          </div>


          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-orange-500" />
              How it works?
            </h4>
            <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
              <li>Create threads to become the <strong>Original Poster (OP)</strong>.</li>
              <li>Other users reply nestedly in the discussion tree.</li>
              <li>You earn credits automatically as comments accumulate under your threads.</li>
              <li>Deeper comments reward higher credit increments, matching the active Policy.</li>
              <li>Deleting comments soft-deletes the comment node and <strong>reverses</strong> the exact credit amount from your profile.</li>
            </ul>
          </div>


          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              Credits Earned Per Discussion Thread
            </h4>

            {loading ? (
              <div className="text-center py-8 text-xs text-slate-500">Loading credit distributions...</div>
            ) : postsCredits.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500">
                You haven't posted any discussion threads yet.
              </div>
            ) : (
              <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {postsCredits.map((post) => (
                  <div key={post._id} className="flex justify-between items-center p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 pr-4">
                      <span className="font-semibold text-xs text-slate-800 line-clamp-1 hover:text-orange-600 transition-colors">
                        {post.title}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Posted on {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 font-bold text-xs rounded-full border border-orange-100/50">
                      <span>+{post.creditsEarned.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>


        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs rounded-xl transition"
          >
            Close Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
export default CreditsPopup;
