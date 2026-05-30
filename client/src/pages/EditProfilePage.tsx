import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Button, Card, Spinner, toast } from "../components/ui";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    bioForHire: "",
    availableForHire: false,
  });

  useEffect(() => {
    apiClient
      .getMyProfile()
      .then((p) =>
        setForm({
          displayName: p.displayName || "",
          bio: p.bio || "",
          bioForHire: p.bioForHire || "",
          availableForHire: !!p.availableForHire,
        }),
      )
      .catch(() => toast.error("Could not load your profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.updateProfile(form);
      await refreshUser();
      toast.success("Profile updated");
      navigate(`/profile/${user?.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>

      <Card padding="lg">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Your display name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell the community about yourself"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <div className="border-t border-gray-100 pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.availableForHire}
                onChange={(e) => setForm({ ...form, availableForHire: e.target.checked })}
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Available for marketplace tasks (list me in the worker directory)
              </span>
            </label>

            {form.availableForHire && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pitch for hire</label>
                <textarea
                  value={form.bioForHire}
                  onChange={(e) => setForm({ ...form, bioForHire: e.target.value })}
                  placeholder="What gardening work can you help with?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20 resize-none focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button fullWidth loading={saving} onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
