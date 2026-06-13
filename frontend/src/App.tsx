import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthForm from './components/AuthForm';
import Dashboard from './pages/Dashboard';
import PostDetails from './pages/PostDetails';
import CreditsPopup from './components/CreditsPopup';

interface UserState {
  id: string;
  name: string;
  email: string;
  totalCredits: number;
}

function App() {
  const [user, setUser] = useState<UserState | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [creditsPopupOpen, setCreditsPopupOpen] = useState(false);

  // Check login status on mount
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/auth/me', { headers });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser({
          id: data.user._id,
          name: data.user.name,
          email: data.user.email,
          totalCredits: data.user.totalCredits
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to verify session token:', err);
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleAuthSuccess = (userData: any, token: string) => {
    localStorage.setItem('token', token);
    setUser({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      totalCredits: userData.totalCredits
    });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('token');
      setUser(null);
      setSelectedPostId(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const refreshUserCredits = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/auth/me', { headers });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(prev => prev ? { ...prev, totalCredits: data.user.totalCredits } : null);
      }
    } catch (err) {
      console.error('Failed to refresh user credits:', err);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center font-bold text-white text-xl animate-bounce shadow-lg shadow-orange-500/20">⚓</div>
          <span className="text-xs text-slate-500 font-semibold tracking-widest uppercase">Connecting to Anchor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {user ? (
        <>
          <Navbar 
            userName={user.name} 
            totalCredits={user.totalCredits} 
            onLogout={handleLogout} 
            onNavigateHome={() => setSelectedPostId(null)}
            onOpenCreditsPopup={() => setCreditsPopupOpen(true)}
          />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8">
            {selectedPostId ? (
              <PostDetails 
                postId={selectedPostId} 
                currentUserId={user.id} 
                onBack={() => setSelectedPostId(null)}
                onRefreshCredits={refreshUserCredits}
              />
            ) : (
              <Dashboard 
                onSelectPost={(id) => setSelectedPostId(id)} 
                onRefreshCredits={refreshUserCredits}
                currentUserId={user.id}
              />
            )}
          </main>
          <CreditsPopup 
            isOpen={creditsPopupOpen}
            onClose={() => setCreditsPopupOpen(false)}
            totalCredits={user.totalCredits}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <AuthForm onAuthSuccess={handleAuthSuccess} />
        </div>
      )}
    </div>
  );
}

export default App;
