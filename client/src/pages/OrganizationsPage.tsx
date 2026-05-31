import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Hexagon } from "lucide-react";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Button, Card, Spinner, EmptyState, Modal, toast } from "../components/ui";

interface Organization {
  id: string;
  name: string;
  description: string | null;
  leader: { displayName: string | null };
  memberCount: number;
  hexCount: number;
}

const MODES = [
  { value: "equal", label: "Equal split", help: "GP shared equally among all members." },
  { value: "leader-cut", label: "Leader cut", help: "Leader takes a percentage, the rest is split equally." },
  { value: "contribution-weighted", label: "Contribution-weighted", help: "GP split by each member's contribution score." },
];

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    distributionMode: "equal",
    leaderCutPercent: 20,
  });

  const canCreate = (user?.level ?? 0) >= 5;

  const load = async () => {
    try {
      setOrgs(await apiClient.getOrganizations());
    } catch {
      toast.error("Could not load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error("Organization name is required");
    setCreating(true);
    try {
      const org = await apiClient.createOrganization(form);
      toast.success("Organization created");
      setShowCreate(false);
      navigate(`/organizations/${org.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 md:py-8 px-2 md:px-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Organizations</h1>
        <Button
          leftIcon={<Building2 size={16} />}
          disabled={!canCreate}
          title={canCreate ? undefined : "Reach Level 5 to found an organization"}
          onClick={() => setShowCreate(true)}
        >
          Create Organization
        </Button>
      </div>
      <p className="text-gray-500 mb-8">
        Teams merge their hexes into shared territory and split Green Points together.
        {!canCreate && " Reach Level 5 to found your own."}
      </p>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size={32} />
        </div>
      ) : orgs.length === 0 ? (
        <EmptyState
          icon={<Building2 size={48} />}
          title="No organizations yet"
          description="Be the first team to claim shared territory across Burgas."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgs.map((org) => (
            <Card key={org.id} hover onClick={() => navigate(`/organizations/${org.id}`)} className="flex flex-col">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-700 mb-3">
                <Building2 size={24} />
              </div>
              <h3 className="text-lg font-bold">{org.name}</h3>
              <p className="text-xs text-gray-400 mb-2">Led by {org.leader.displayName || "—"}</p>
              {org.description && <p className="text-sm text-gray-600 line-clamp-2 flex-1">{org.description}</p>}
              <div className="flex gap-4 text-sm text-gray-500 mt-4">
                <span className="flex items-center gap-1">
                  <Users size={14} /> {org.memberCount}
                </span>
                <span className="flex items-center gap-1">
                  <Hexagon size={14} /> {org.hexCount} hexes
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create an organization"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button loading={creating} onClick={handleCreate}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Burgas Green Guild"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is your team about?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20 resize-none focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GP distribution</label>
            <select
              value={form.distributionMode}
              onChange={(e) => setForm({ ...form, distributionMode: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {MODES.find((m) => m.value === form.distributionMode)?.help}
            </p>
          </div>
          {form.distributionMode === "leader-cut" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leader cut: {form.leaderCutPercent}%
              </label>
              <input
                type="range"
                min={10}
                max={30}
                value={form.leaderCutPercent}
                onChange={(e) => setForm({ ...form, leaderCutPercent: parseInt(e.target.value) })}
                className="w-full accent-green-600"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
