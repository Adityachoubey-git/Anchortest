import React from 'react';
import { LogOut, Trophy, Anchor } from 'lucide-react';

interface NavbarProps {
  userName: string;
  totalCredits: number;
  onLogout: () => void;
  onNavigateHome: () => void;
  onOpenCreditsPopup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ userName, totalCredits, onLogout, onNavigateHome, onOpenCreditsPopup }) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm">
      <div
        onClick={onNavigateHome}
        className="flex items-center gap-2.5 cursor-pointer group select-none"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition-all">
          <Anchor className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg text-slate-900 tracking-wide block leading-none">Anchor</span>
          <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Discussion Forum</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-black text-sm font-medium">
            Welcome, <span className="text-slate-900 font-bold">{userName}</span>
          </span>
          <div
            onClick={onOpenCreditsPopup}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm tracking-wide shadow-md shadow-orange-500/10 hover:scale-105 transition-all select-none cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-white" />
            <span>{totalCredits.toLocaleString()} Credits</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 text-sm font-medium px-3 py-2 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
export default Navbar;
