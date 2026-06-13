import React, { useState } from 'react';
import { Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';

interface AuthFormProps {
  onAuthSuccess: (user: { id: string; name: string; email: string; totalCredits: number }, token: string) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body = isLogin ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setErrorMsg(isLogin ? 'Invalid credentials' : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto glass-card rounded-3xl p-8 glow-orange border-slate-200">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-orange-500/20 mx-auto mb-3">⚓</div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          {isLogin ? 'Log in to participate in the discussions' : 'Sign up to write posts and earn credits'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-black" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 placeholder-slate-450"
                placeholder="John Doe"
                disabled={loading}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-black-450" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 placeholder-slate-450"
              placeholder="john@example.com"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-black-450" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 placeholder-slate-450"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-orange-500/10 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 select-none mt-2"
        >
          {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <div className="text-center mt-6 pt-4 border-t border-slate-100">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setErrorMsg('');
          }}
          className="text-xs text-slate-500 hover:text-orange-600 font-semibold   "
          disabled={loading}
        >
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  );
};
export default AuthForm;
