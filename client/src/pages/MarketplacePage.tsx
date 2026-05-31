import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Coins, Zap, Plus, Star, ClipboardList } from "lucide-react";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Button, Card, Badge, Avatar, Spinner, EmptyState, Modal, Stars, toast } from "../components/ui";

interface Task {
  id: string;
  title: string;
  description: string;
  budgetGP: number;
  status: string;
  posterId: string;
  poster: { id: string; displayName: string | null; profileImage: string | null; averageRating: number | null };
  promoted?: boolean;
  applicationCount?: number;
}

interface Worker {
  id: string;
  displayName: string | null;
  username: string;
  profileImage: string | null;
  bioForHire: string | null;
  averageRating: number | null;
  level: number;
  boosted: boolean;
  reviewCount: number;
  completedTasks: number;
}

interface Application {
  id: string;
  proposedGP: number;
  status: string;
  applicant: { id: string; displayName: string | null; profileImage: string | null; averageRating: number | null };
}

interface PostedTask extends Task {
  assignedWorker: { id: string; displayName: string | null } | null;
  applications: Application[];
}

interface AssignedTask extends Task {
  poster: { id: string; displayName: string | null; profileImage: string | null; averageRating: number | null };
}

type Tab = "open" | "workers" | "mine";

export default function MarketplacePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [tab, setTab] = useState<Tab>("open");
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [mine, setMine] = useState<{ posted: PostedTask[]; assigned: AssignedTask[] }>({ posted: [], assigned: [] });

  // Apply modal
  const [applyTask, setApplyTask] = useState<Task | null>(null);
  const [proposedGP, setProposedGP] = useState("");
  const [applying, setApplying] = useState(false);

  // Complete + review modal
  const [completeTask, setCompleteTask] = useState<PostedTask | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [completing, setCompleting] = useState(false);

  const load = async (which: Tab = tab) => {
    setLoading(true);
    try {
      if (which === "open") setTasks(await apiClient.getTasks("open"));
      else if (which === "workers") setWorkers(await apiClient.getWorkers());
      else setMine(await apiClient.getMyTasks());
    } catch {
      toast.error("Could not load marketplace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openApply = (task: Task) => {
    setApplyTask(task);
    setProposedGP(String(task.budgetGP));
  };

  const submitApply = async () => {
    if (!applyTask) return;
    setApplying(true);
    try {
      await apiClient.applyForTask(applyTask.id, parseInt(proposedGP) || applyTask.budgetGP);
      toast.success("Application submitted");
      setApplyTask(null);
      load("open");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Application failed");
    } finally {
      setApplying(false);
    }
  };

  const accept = async (appId: string) => {
    try {
      await apiClient.acceptApplication(appId);
      toast.success("Worker accepted");
      load("mine");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Accept failed");
    }
  };

  const submitComplete = async () => {
    if (!completeTask) return;
    setCompleting(true);
    try {
      await apiClient.completeTask(completeTask.id, { rating, comment: comment.trim() || undefined });
      toast.success("Task completed and worker paid");
      setCompleteTask(null);
      setComment("");
      setRating(5);
      await Promise.all([load("mine"), refreshUser()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Completion failed");
    } finally {
      setCompleting(false);
    }
  };

  const statusColor = (s: string) =>
    s === "open" ? "green" : s === "in-progress" ? "blue" : s === "completed" ? "gray" : "yellow";

  return (
    <div className="w-full max-w-5xl mx-auto py-4 md:py-8 px-2 md:px-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Marketplace</h1>
        <Button leftIcon={<Plus size={16} />} onClick={() => navigate("/marketplace/post-task")}>
          Post a Task
        </Button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          ["open", "Open Tasks"],
          ["workers", "Workers"],
          ["mine", "My Tasks"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size={32} />
        </div>
      ) : tab === "open" ? (
        tasks.length === 0 ? (
          <EmptyState icon={<Briefcase size={48} />} title="No open tasks right now" description="Check back soon or post your own." />
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <Card key={task.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{task.title}</h3>
                      {task.promoted && (
                        <Badge color="yellow">
                          <Zap size={11} /> Boosted
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Avatar name={task.poster.displayName} src={task.poster.profileImage} size="sm" /> {task.poster.displayName}
                      </span>
                      <span>· {task.applicationCount ?? 0} applicants</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-green-600 flex items-center gap-1 justify-end">
                      <Coins size={16} /> {task.budgetGP}
                    </p>
                    {task.posterId === user?.id ? (
                      <Badge color="gray" className="mt-2">
                        Your task
                      </Badge>
                    ) : (
                      <Button size="sm" className="mt-2" onClick={() => openApply(task)}>
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : tab === "workers" ? (
        workers.length === 0 ? (
          <EmptyState icon={<Star size={48} />} title="No workers available" description="Gardeners appear here when they mark themselves available for hire." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {workers.map((w) => (
              <Card key={w.id} className="flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={w.displayName || w.username} src={w.profileImage} />
                  <div className="min-w-0">
                    <Link to={`/profile/${w.id}`} className="font-semibold hover:text-green-600 flex items-center gap-1">
                      {w.displayName || w.username}
                      {w.boosted && <Badge color="purple">PRO</Badge>}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Stars value={w.averageRating} size={13} showValue />
                      <span>({w.reviewCount})</span>
                    </div>
                  </div>
                </div>
                {w.bioForHire && <p className="text-sm text-gray-600 flex-1">{w.bioForHire}</p>}
                <div className="flex gap-3 text-xs text-gray-400 mt-3">
                  <span>Lv {w.level}</span>
                  <span>· {w.completedTasks} tasks done</span>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <MyTasks mine={mine} onAccept={accept} onComplete={(t) => setCompleteTask(t)} statusColor={statusColor} />
      )}

      {/* Apply modal */}
      <Modal
        open={!!applyTask}
        onClose={() => setApplyTask(null)}
        title={`Apply: ${applyTask?.title ?? ""}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setApplyTask(null)}>
              Cancel
            </Button>
            <Button loading={applying} onClick={submitApply}>
              Submit Application
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 mb-4">
          The poster's budget is <span className="font-semibold">{applyTask?.budgetGP} GP</span>. Propose your rate — you can negotiate.
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Your proposed rate (GP)</label>
        <input
          type="number"
          min={1}
          value={proposedGP}
          onChange={(e) => setProposedGP(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
        <p className="mt-2 text-xs text-gray-400">You need at least one approved planting post to apply.</p>
      </Modal>

      {/* Complete + review modal */}
      <Modal
        open={!!completeTask}
        onClose={() => setCompleteTask(null)}
        title="Complete task & review"
        footer={
          <>
            <Button variant="outline" onClick={() => setCompleteTask(null)}>
              Cancel
            </Button>
            <Button loading={completing} onClick={submitComplete}>
              Pay {completeTask?.budgetGP} GP & Complete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 mb-4">
          This pays <span className="font-semibold">{completeTask?.budgetGP} GP</span> to{" "}
          <span className="font-semibold">{completeTask?.assignedWorker?.displayName}</span> and closes the task.
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
        <Stars value={rating} onChange={setRating} size={28} />
        <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How did it go?"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20 resize-none focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
      </Modal>
    </div>
  );
}

function MyTasks({
  mine,
  onAccept,
  onComplete,
  statusColor,
}: {
  mine: { posted: PostedTask[]; assigned: AssignedTask[] };
  onAccept: (appId: string) => void;
  onComplete: (task: PostedTask) => void;
  statusColor: (s: string) => "green" | "blue" | "gray" | "yellow";
}) {
  if (mine.posted.length === 0 && mine.assigned.length === 0) {
    return <EmptyState icon={<ClipboardList size={48} />} title="No tasks yet" description="Tasks you post or get hired for show up here." />;
  }

  return (
    <div className="space-y-8">
      {mine.posted.length > 0 && (
        <section>
          <h2 className="font-bold mb-3">Tasks I posted</h2>
          <div className="space-y-4">
            {mine.posted.map((task) => (
              <Card key={task.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{task.title}</h3>
                    <p className="text-sm text-gray-500">{task.budgetGP} GP</p>
                  </div>
                  <Badge color={statusColor(task.status)}>{task.status}</Badge>
                </div>

                {task.status === "open" && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    {task.applications.length === 0 ? (
                      <p className="text-sm text-gray-400">No applications yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {task.applications.map((app) => (
                          <div key={app.id} className="flex items-center gap-3">
                            <Avatar name={app.applicant.displayName} src={app.applicant.profileImage} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{app.applicant.displayName}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Stars value={app.applicant.averageRating} size={12} />
                                <span>· {app.proposedGP} GP</span>
                              </div>
                            </div>
                            {app.status === "pending" ? (
                              <Button size="sm" onClick={() => onAccept(app.id)}>
                                Accept
                              </Button>
                            ) : (
                              <Badge color={app.status === "accepted" ? "green" : "gray"}>{app.status}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {task.status === "in-progress" && task.assignedWorker && (
                  <div className="mt-3 border-t border-gray-100 pt-3 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Assigned to <span className="font-medium">{task.assignedWorker.displayName}</span>
                    </p>
                    <Button size="sm" onClick={() => onComplete(task)}>
                      Mark complete
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {mine.assigned.length > 0 && (
        <section>
          <h2 className="font-bold mb-3">Tasks I'm working on</h2>
          <div className="space-y-4">
            {mine.assigned.map((task) => (
              <Card key={task.id} className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{task.title}</h3>
                  <p className="text-sm text-gray-500">
                    {task.budgetGP} GP · for {task.poster.displayName}
                  </p>
                </div>
                <Badge color={statusColor(task.status)}>{task.status}</Badge>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
