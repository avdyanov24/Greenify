import { Link, useLocation } from "react-router-dom";
import {
  MapPin, BookOpen, Plus, User, Users, Briefcase,
  Gift, CreditCard, Shield, Trophy, Award, Leaf, X,
} from "lucide-react";
import { useAuthStore } from "../utils/store";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const isActive = (path: string) => location.pathname.startsWith(path);
  const isStaff = user?.role === "moderator" || user?.role === "admin";
  const plan = user?.subscription?.status === "active" ? user.subscription.type : null;

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-100 flex flex-col overflow-y-auto">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 shrink-0">
        <Link to="/feed" onClick={onClose} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center shadow-sm">
            <Leaf size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-gray-900">Greenify</span>
        </Link>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5">
        <Section label="Explore">
          <NavLink to="/map" icon={<MapPin size={17} />} label="Map" active={isActive("/map")} onClose={onClose} />
          <NavLink to="/feed" icon={<BookOpen size={17} />} label="Feed" active={isActive("/feed")} onClose={onClose} />
          <NavLink to="/create-post" icon={<Plus size={17} />} label="Plant" active={isActive("/create-post")} onClose={onClose} accent />
        </Section>

        <Section label="Community">
          <NavLink
            to={user ? `/profile/${user.id}` : "/login"}
            icon={<User size={17} />}
            label="Profile"
            active={location.pathname.startsWith("/profile") && !location.pathname.includes("edit")}
            onClose={onClose}
          />
          <NavLink to="/organizations" icon={<Users size={17} />} label="Organizations" active={isActive("/organizations")} onClose={onClose} />
          <NavLink to="/marketplace" icon={<Briefcase size={17} />} label="Marketplace" active={isActive("/marketplace")} onClose={onClose} />
          <NavLink to="/leaderboard" icon={<Trophy size={17} />} label="Leaderboard" active={isActive("/leaderboard")} onClose={onClose} />
          <NavLink to="/achievements" icon={<Award size={17} />} label="Achievements" active={isActive("/achievements")} onClose={onClose} />
        </Section>

        <Section label="Account">
          <NavLink to="/vouchers" icon={<Gift size={17} />} label="Vouchers" active={isActive("/vouchers")} onClose={onClose} />
          <NavLink to="/subscriptions" icon={<CreditCard size={17} />} label="Subscriptions" active={isActive("/subscriptions")} onClose={onClose} />
          {isStaff && (
            <NavLink to="/admin/moderation" icon={<Shield size={17} />} label="Moderation" active={isActive("/admin")} onClose={onClose} />
          )}
        </Section>
      </nav>

      {/* Plan badge */}
      {plan && (
        <div className="mx-3 mb-4 shrink-0 rounded-xl bg-gradient-to-br from-green-700 to-emerald-500 text-white px-4 py-3">
          <p className="text-[10px] font-medium opacity-70 uppercase tracking-wider">Current Plan</p>
          <p className="text-sm font-bold">{plan.toUpperCase()} Member</p>
        </div>
      )}
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-4 pb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClose?: () => void;
  accent?: boolean;
}

function NavLink({ to, icon, label, active, onClose, accent }: NavLinkProps) {
  const base = "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150";

  if (accent && !active) {
    return (
      <Link to={to} onClick={onClose}
        className={`${base} bg-green-700 text-white font-semibold hover:bg-green-800 shadow-sm`}>
        {icon} {label}
      </Link>
    );
  }

  return (
    <Link to={to} onClick={onClose}
      className={`${base} ${active
        ? "bg-green-50 text-green-800 font-semibold"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}>
      <span className={active ? "text-green-700" : "text-gray-400"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-green-600 shrink-0" />}
    </Link>
  );
}
