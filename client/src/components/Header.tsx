import { Link, useNavigate } from "react-router-dom";
import { Leaf, LogOut, Coins, Sparkles, Menu, X } from "lucide-react";
import { useAuthStore } from "../utils/store";
import { Avatar, Badge } from "./ui";

interface HeaderProps {
  onMenuClick?: () => void;
  mobileMenuOpen?: boolean;
}

export default function Header({ onMenuClick, mobileMenuOpen }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const plan = user?.subscription?.status === "active" ? user.subscription.type : null;

  return (
    <header className="bg-white border-b border-gray-100 px-3 md:px-6 py-3 flex items-center gap-2 shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Brand — mobile only (desktop brand lives in sidebar) */}
      <Link to="/feed" className="md:hidden flex items-center gap-1.5 mr-1">
        <Leaf className="text-green-700" size={20} />
        <span className="text-base font-bold text-gray-900">Greenify</span>
      </Link>

      <div className="flex-1" />

      {/* Stats pill — hidden on very small screens */}
      {user && (
        <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-sm">
          <Badge color="green">Lv {user.level}</Badge>
          <span className="text-green-700 font-semibold flex items-center gap-1">
            <Sparkles size={13} /> {user.xp} XP
          </span>
          <span className="text-gray-200 select-none">|</span>
          <span className="text-amber-600 font-semibold flex items-center gap-1">
            <Coins size={13} /> {user.greenPoints} GP
          </span>
          {plan && <Badge color="purple">{plan.toUpperCase()}</Badge>}
        </div>
      )}

      {/* Avatar */}
      {user && (
        <Link to={`/profile/${user.id}`} title="My profile" className="shrink-0">
          <Avatar
            name={user.displayName || user.username}
            src={user.profileImage}
            size="sm"
            className="hover:ring-2 hover:ring-green-400 hover:ring-offset-1 transition cursor-pointer"
          />
        </Link>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
        title="Logout"
      >
        <LogOut size={18} />
      </button>
    </header>
  );
}
