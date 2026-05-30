import { useEffect, useState } from "react";
import { ShieldAlert, Check, X, Ban, Users, FileCheck, Hexagon, Flag } from "lucide-react";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Button, Card, Badge, Avatar, Spinner, EmptyState, StatCard, toast } from "../components/ui";

interface Flag {
  id: string;
  reason: string;
  reportCount: number;
  post: {
    id: string;
    title: string;
    description: string | null;
    images: { imageUrl: string; order: number }[];
    user: { id: string; displayName: string | null; username: string; isBanned: boolean };
  };
}

interface Stats {
  users: number;
  approvedPosts: number;
  hexesClaimed: number;
  pendingFlags: number;
  bannedUsers: number;
}

interface AdminUser {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  role: string;
  isBanned: boolean;
  level: number;
  postCount: number;
}

export default function ModerationDashboard() {
  const me = useAuthStore((s) => s.user);
  const isStaff = me?.role === "moderator" || me?.role === "admin";

  const [stats, setStats] = useState<Stats | null>(null);
  const [queue, setQueue] = useState<Flag[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, q, u] = await Promise.all([
        apiClient.getAdminStats(),
        apiClient.getModerationQueue(),
        apiClient.getAdminUsers(),
      ]);
      setStats(s);
      setQueue(q);
      setUsers(u);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) load();
    else setLoading(false);
  }, [isStaff]);

  if (!isStaff) {
    return (
      <EmptyState
        icon={<ShieldAlert size={48} />}
        title="Moderators only"
        description="You don't have permission to view the moderation dashboard."
      />
    );
  }

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  const approve = async (postId: string) => {
    try {
      await apiClient.approvePost(postId);
      toast.success("Post approved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const reject = async (postId: string) => {
    try {
      await apiClient.rejectPost(postId);
      toast.success("Post rejected");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    }
  };

  const ban = async (userId: string) => {
    try {
      const res = await apiClient.banUser(userId);
      toast.success(res.message || "Updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ban failed");
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Moderation Dashboard</h1>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Pending flags" value={stats.pendingFlags} icon={<Flag size={18} />} color="text-yellow-600" />
          <StatCard label="Total users" value={stats.users} icon={<Users size={18} />} color="text-green-600" />
          <StatCard label="Approved posts" value={stats.approvedPosts} icon={<FileCheck size={18} />} color="text-blue-600" />
          <StatCard label="Hexes claimed" value={stats.hexesClaimed} icon={<Hexagon size={18} />} color="text-emerald-600" />
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Flagged posts queue</h2>
        {queue.length === 0 ? (
          <EmptyState icon={<Check size={48} />} title="Queue is clear" description="No posts awaiting review." />
        ) : (
          <div className="space-y-4">
            {queue.map((flag) => (
              <Card key={flag.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold">{flag.post.title}</h3>
                    <p className="text-xs text-gray-500">
                      by {flag.post.user.displayName || flag.post.user.username}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge color="yellow">{flag.reason}</Badge>
                    {flag.reportCount > 1 && <Badge color="red">{flag.reportCount} reports</Badge>}
                  </div>
                </div>
                {flag.post.description && <p className="text-sm text-gray-600 mb-3">{flag.post.description}</p>}
                {flag.post.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {flag.post.images.map((img) => (
                      <img key={img.order} src={img.imageUrl} alt="" className="w-full h-24 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" leftIcon={<Check size={15} />} onClick={() => approve(flag.post.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" leftIcon={<X size={15} />} onClick={() => reject(flag.post.id)}>
                    Reject
                  </Button>
                  <Button size="sm" variant="danger" leftIcon={<Ban size={15} />} onClick={() => ban(flag.post.user.id)}>
                    {flag.post.user.isBanned ? "Unban author" : "Ban author"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Users</h2>
        <Card padding="none">
          <div className="divide-y divide-gray-50">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={u.displayName || u.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    {u.displayName || u.username}
                    {u.role !== "user" && <Badge color="purple">{u.role}</Badge>}
                    {u.isBanned && <Badge color="red">banned</Badge>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {u.email} · Lv {u.level} · {u.postCount} posts
                  </p>
                </div>
                {u.role !== "admin" && (
                  <Button
                    size="sm"
                    variant={u.isBanned ? "outline" : "danger"}
                    onClick={() => ban(u.id)}
                  >
                    {u.isBanned ? "Unban" : "Ban"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
