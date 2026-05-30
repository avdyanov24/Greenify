import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Building2, Hexagon, Sprout, Users, Settings, UserMinus, Crown } from "lucide-react";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Button, Card, Badge, Avatar, Spinner, StatCard, toast } from "../components/ui";

interface Member {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  displayName: string | null;
  username: string;
  profileImage: string | null;
  level: number;
  postCount: number;
  contributionScore: number;
}

interface OrgDetail {
  id: string;
  name: string;
  description: string | null;
  leader: { id: string; displayName: string | null };
  leaderId: string;
  distributionMode: string;
  leaderCutPercent: number | null;
  hexCount: number;
  totalPlants: number;
  members: Member[];
}

const MODE_LABELS: Record<string, string> = {
  equal: "Equal split",
  "leader-cut": "Leader cut",
  "contribution-weighted": "Contribution-weighted",
};

export default function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState("equal");

  const load = async () => {
    if (!orgId) return;
    try {
      const data = await apiClient.getOrganization(orgId);
      setOrg(data);
      setMode(data.distributionMode);
    } catch {
      toast.error("Could not load organization");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size={32} />
      </div>
    );
  }
  if (!org) {
    return <div className="py-16 text-center text-red-500">Organization not found</div>;
  }

  const isLeader = user?.id === org.leaderId;
  const isMember = org.members.some((m) => m.userId === user?.id);

  const handleJoin = async () => {
    setBusy(true);
    try {
      await apiClient.joinOrg(org.id);
      toast.success("Joined organization");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Join failed");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await apiClient.leaveOrg(org.id);
      toast.success("Left organization");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Leave failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await apiClient.removeMember(org.id, userId);
      toast.success("Member removed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  };

  const handleSaveSettings = async () => {
    try {
      await apiClient.updateOrganization(org.id, { distributionMode: mode });
      toast.success("Settings saved");
      setShowSettings(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <button onClick={() => navigate("/organizations")} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
        ← All organizations
      </button>

      <Card padding="lg" className="mb-6">
        <div className="flex gap-5 items-start">
          <div className="w-20 h-20 rounded-xl bg-green-100 flex items-center justify-center text-green-700 shrink-0">
            <Building2 size={36} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">{org.name}</h1>
                <p className="text-sm text-gray-500">
                  Led by{" "}
                  <Link to={`/profile/${org.leader.id}`} className="hover:text-green-600">
                    {org.leader.displayName || "—"}
                  </Link>
                </p>
              </div>
              <div className="flex gap-2">
                {isLeader && (
                  <Button variant="outline" size="sm" leftIcon={<Settings size={15} />} onClick={() => setShowSettings((s) => !s)}>
                    Settings
                  </Button>
                )}
                {!isMember && user && (
                  <Button size="sm" loading={busy} onClick={handleJoin}>
                    Join
                  </Button>
                )}
                {isMember && !isLeader && (
                  <Button variant="outline" size="sm" loading={busy} onClick={handleLeave}>
                    Leave
                  </Button>
                )}
              </div>
            </div>
            {org.description && <p className="text-gray-600 mt-3">{org.description}</p>}
            <div className="mt-3">
              <Badge color="green">{MODE_LABELS[org.distributionMode] || org.distributionMode}</Badge>
              {org.distributionMode === "leader-cut" && org.leaderCutPercent != null && (
                <Badge color="gray" className="ml-2">
                  {org.leaderCutPercent}% leader cut
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {showSettings && isLeader && (
        <Card padding="lg" className="mb-6 border-green-200">
          <h2 className="font-bold mb-3">Distribution settings</h2>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              {Object.entries(MODE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <Button onClick={handleSaveSettings}>Save</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Members" value={org.members.length} icon={<Users size={18} />} color="text-green-600" />
        <StatCard label="Territory" value={`${org.hexCount} hexes`} icon={<Hexagon size={18} />} color="text-blue-600" />
        <StatCard label="Plants" value={org.totalPlants} icon={<Sprout size={18} />} color="text-emerald-600" />
      </div>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold">Member contribution leaderboard</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {org.members.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 px-6 py-3">
              <span className="w-6 text-center text-sm font-bold text-gray-400">{i + 1}</span>
              <Avatar name={m.displayName || m.username} src={m.profileImage} size="sm" />
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${m.userId}`} className="font-medium text-sm hover:text-green-600 flex items-center gap-1">
                  {m.displayName || m.username}
                  {m.role === "leader" && <Crown size={13} className="text-yellow-500" />}
                </Link>
                <p className="text-xs text-gray-400">
                  Lv {m.level} · {m.postCount} posts
                </p>
              </div>
              <Badge color="green">{m.contributionScore} pts</Badge>
              {isLeader && m.userId !== org.leaderId && (
                <button
                  onClick={() => handleRemove(m.userId)}
                  className="text-gray-300 hover:text-red-500 transition"
                  title="Remove member"
                >
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
