import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Button, Card, toast } from "../components/ui";

export default function PostTaskPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({ title: "", description: "", budgetGP: "" });
  const [submitting, setSubmitting] = useState(false);

  const budget = parseInt(form.budgetGP) || 0;
  const balance = user?.greenPoints ?? 0;

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      return toast.error("Title and description are required");
    }
    if (budget <= 0) return toast.error("Budget must be a positive number of GP");
    if (budget > balance) return toast.error(`You only have ${balance} GP to fund this task`);

    setSubmitting(true);
    try {
      await apiClient.createTask({ title: form.title, description: form.description, budgetGP: budget });
      toast.success("Task posted to the marketplace");
      navigate("/marketplace");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Post a Task</h1>
      <p className="text-gray-500 mb-8">
        Hire a fellow gardener. Your budget is held from your balance and paid out when you mark the task complete.
      </p>

      <Card padding="lg">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Water my roses for a week"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what needs doing, when, and where."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-28 resize-none focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget (GP)</label>
            <input
              type="number"
              min={1}
              value={form.budgetGP}
              onChange={(e) => setForm({ ...form, budgetGP: e.target.value })}
              placeholder="How much are you offering?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
              <Coins size={13} /> Your balance: {balance} GP
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => navigate("/marketplace")}>
              Cancel
            </Button>
            <Button fullWidth loading={submitting} onClick={handleSubmit}>
              Post Task
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
