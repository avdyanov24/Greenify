import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "../utils/store";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const isActive = (path: string) => location.pathname.startsWith(path);
  const isStaff = user?.role === "moderator" || user?.role === "admin";
  const plan = user?.subscription?.status === "active" ? user.subscription.type : null;

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(false);
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hasMounted = useRef(false);

  // Close sidebar on mobile only after the initial mount when the route changes
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    if (isMobile && onClose) {
      onClose();
    }
  }, [location.pathname, isMobile, onClose]);

  return (
    <aside className={`bg-white border-r border-gray-200 p-5 flex flex-col transition-all duration-300 ${isCollapsed ? "w-20" : "w-full max-w-xs sm:w-72 md:w-64"}`}>
      <div className="flex items-center justify-between mb-4">
        {!isCollapsed && <h1 className="text-lg font-bold text-green-700">Greenify</h1>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100 rounded-lg transition hidden md:inline-flex"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <nav className="space-y-1.5 flex-1">
        <SidebarLink to="/map" icon={<MapPin size={20} />} label="Map" active={isActive("/map")} collapsed={isCollapsed} />
        <SidebarLink to="/feed" icon={<BookOpen size={20} />} label="Feed" active={isActive("/feed")} collapsed={isCollapsed} />
        <SidebarLink to="/create-post" icon={<Plus size={20} />} label="Plant" active={isActive("/create-post")} collapsed={isCollapsed} />
        <SidebarLink
          to={user ? `/profile/${user.id}` : "/login"}
          icon={<User size={20} />}
          label="Profile"
          active={location.pathname.startsWith("/profile") && !location.pathname.includes("edit")}
          collapsed={isCollapsed}
        />
        <SidebarLink to="/organizations" icon={<Users size={20} />} label="Organizations" active={isActive("/organizations")} collapsed={isCollapsed} />
        <SidebarLink to="/marketplace" icon={<Briefcase size={20} />} label="Marketplace" active={isActive("/marketplace")} collapsed={isCollapsed} />
        <SidebarLink to="/leaderboard" icon={<Trophy size={20} />} label="Leaderboard" active={isActive("/leaderboard")} collapsed={isCollapsed} />
        <SidebarLink to="/achievements" icon={<Award size={20} />} label="Achievements" active={isActive("/achievements")} collapsed={isCollapsed} />
        <SidebarLink to="/vouchers" icon={<Gift size={20} />} label="Vouchers" active={isActive("/vouchers")} collapsed={isCollapsed} />
        <SidebarLink to="/subscriptions" icon={<CreditCard size={20} />} label="Subscriptions" active={isActive("/subscriptions")} collapsed={isCollapsed} />
        {isStaff && (
          <SidebarLink to="/admin/moderation" icon={<Shield size={20} />} label="Moderation" active={isActive("/admin")} collapsed={isCollapsed} />
        )}
      </nav>

      {plan && (
        <div className={`mt-4 rounded-lg bg-gradient-to-r from-green-700 to-emerald-600 text-white px-3 py-2 text-sm font-semibold text-center ${isCollapsed ? "text-xs" : ""}`}
          title={isCollapsed ? plan.toUpperCase() : undefined}
        >
          {isCollapsed ? plan.charAt(0).toUpperCase() : plan.toUpperCase()}
          {!isCollapsed && " member"}
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
  collapsed: boolean;
}

function SidebarLink({ to, icon, label, active, collapsed }: SidebarLinkProps) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${collapsed ? "w-10 h-10 justify-center" : ""} ${
        active ? "bg-green-50 text-green-800 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
      title={collapsed ? label : undefined}
    >
      <span className={collapsed ? "scale-125" : ""}>
        {icon}
      </span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
