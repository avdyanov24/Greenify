import { Link, useLocation } from "react-router-dom";
import {
  MapPin,
  BookOpen,
  Plus,
  User,
  Users,
  Briefcase,
  Gift,
  CreditCard,
  Shield,
  Trophy,
  Award,
} from "lucide-react";
import { useAuthStore } from "../utils/store";

export default function Sidebar() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const isActive = (path: string) => location.pathname.startsWith(path);
  const isStaff = user?.role === "moderator" || user?.role === "admin";
  const plan = user?.subscription?.status === "active" ? user.subscription.type : null;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-5 flex flex-col">
      <nav className="space-y-1.5 flex-1">
        <SidebarLink to="/map" icon={<MapPin size={20} />} label="Map" active={isActive("/map")} />
        <SidebarLink to="/feed" icon={<BookOpen size={20} />} label="Feed" active={isActive("/feed")} />
        <SidebarLink to="/create-post" icon={<Plus size={20} />} label="Plant" active={isActive("/create-post")} />
        <SidebarLink
          to={user ? `/profile/${user.id}` : "/login"}
          icon={<User size={20} />}
          label="Profile"
          active={location.pathname.startsWith("/profile") && !location.pathname.includes("edit")}
        />
        <SidebarLink to="/organizations" icon={<Users size={20} />} label="Organizations" active={isActive("/organizations")} />
        <SidebarLink to="/marketplace" icon={<Briefcase size={20} />} label="Marketplace" active={isActive("/marketplace")} />
        <SidebarLink to="/leaderboard" icon={<Trophy size={20} />} label="Leaderboard" active={isActive("/leaderboard")} />
        <SidebarLink to="/achievements" icon={<Award size={20} />} label="Achievements" active={isActive("/achievements")} />
        <SidebarLink to="/vouchers" icon={<Gift size={20} />} label="Vouchers" active={isActive("/vouchers")} />
        <SidebarLink to="/subscriptions" icon={<CreditCard size={20} />} label="Subscriptions" active={isActive("/subscriptions")} />
        {isStaff && (
          <SidebarLink to="/admin/moderation" icon={<Shield size={20} />} label="Moderation" active={isActive("/admin")} />
        )}
      </nav>

      {plan && (
        <div className="mt-4 rounded-lg bg-gradient-to-r from-green-700 to-emerald-600 text-white px-3 py-2 text-sm font-semibold text-center">
          {plan.toUpperCase()} member
        </div>
      )}
    </aside>
  );
}

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

function SidebarLink({ to, icon, label, active }: SidebarLinkProps) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
        active ? "bg-green-50 text-green-800 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
