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
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-1 hover:bg-gray-100 rounded-lg transition mr-2"
        title="Toggle menu"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <Link to="/feed" className="flex items-center gap-2">
        <Leaf className="text-green-700 md:text-[26px]" size={24} />
        <h1 className="hidden sm:block text-lg md:text-xl font-bold text-gray-900 font-display">Greenify</h1>
      </Link>

      <div className="flex items-center gap-2 md:gap-4">
        {user && (
          <div className="hidden sm:flex items-center gap-2 text-xs md:text-sm">
            <Badge color="green">Lv {user.level}</Badge>
            <span className="text-green-700 font-medium flex items-center gap-1">
              <Sparkles size={14} /> {user.xp} XP
            </span>
            <span className="text-amber-600 font-semibold flex items-center gap-1">
              <Coins size={14} /> {user.greenPoints} GP
            </span>
            {plan && <Badge color="purple" className="hidden md:flex">{plan.toUpperCase()}</Badge>}
          </div>
        )}

        {user && (
          <Link to={`/profile/${user.id}`} title="My profile">
            <Avatar name={user.displayName || user.username} src={user.profileImage} size="sm" className="hover:ring-2 hover:ring-green-300 transition" />
          </Link>
        )}

        <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 transition" title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
