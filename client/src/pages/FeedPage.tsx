import { useEffect, useState } from "react";
import { Heart, MessageCircle, TreePine, Flower2, Leaf, Zap, Flag, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Button, Card, Badge, Avatar, Spinner, EmptyState, Modal, toast } from "../components/ui";

interface Post {
  id: string;
  title: string;
  description: string;
  plantType: string;
  createdAt: string;
  endorsementCount: number;
  images: { imageUrl: string; order: number }[];
  user: { id: string; displayName: string | null; profileImage: string | null };
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; displayName: string | null; profileImage: string | null };
}

function plantIcon(type: string) {
  if (type === "tree") return <TreePine size={12} className="text-green-700" />;
  if (type === "flower") return <Flower2 size={12} className="text-pink-500" />;
  return <Leaf size={12} className="text-green-500" />;
}

export default function FeedPage() {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [endorsing, setEndorsing] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  const loadPosts = async (plantType?: string) => {
    setLoading(true);
    try {
      const data = await apiClient.getPosts(1, 20, plantType);
      setPosts(data.posts || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(filter || undefined);
  }, [filter]);

  const handleEndorse = async (postId: string) => {
    setEndorsing(postId);
    try {
      await apiClient.endorsePost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, endorsementCount: p.endorsementCount + 1 } : p)),
      );
      toast.success("Endorsed! Bonus hex granted to the planter.");
      refreshUser();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not endorse");
    } finally {
      setEndorsing(null);
    }
  };

  const handleBoost = async (postId: string) => {
    try {
      await apiClient.createBoost({ postId });
      toast.success("Post boosted for a week (demo — no charge).");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Boost failed");
    }
  };

  const submitReport = async () => {
    if (!reportFor) return;
    try {
      await apiClient.reportPost(reportFor, reportReason.trim() || "community-report");
      toast.success("Report submitted to moderators");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Report failed");
    } finally {
      setReportFor(null);
      setReportReason("");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 md:py-8 px-2 md:px-4">
      <div className="flex items-center justify-between mb-6 flex-col gap-4 sm:flex-row">
        <h1 className="text-2xl md:text-3xl font-bold">Planting Feed</h1>
        <Link to="/create-post">
          <Button size="sm" leftIcon={<Leaf size={15} />}>
            Plant
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["", "tree", "flower", "grass"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              filter === type ? "bg-green-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {type === "" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size={32} />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Leaf size={48} />}
          title="No posts yet"
          description="Be the first to plant something in Burgas!"
          action={
            <Link to="/create-post">
              <Button>Plant Now</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isOwn={post.user.id === user?.id}
              endorsing={endorsing === post.id}
              onEndorse={() => handleEndorse(post.id)}
              onBoost={() => handleBoost(post.id)}
              onReport={() => setReportFor(post.id)}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!reportFor}
        onClose={() => setReportFor(null)}
        title="Report post"
        footer={
          <>
            <Button variant="outline" onClick={() => setReportFor(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitReport}>
              Submit report
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
        <input
          type="text"
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          placeholder="e.g., not a real planting, duplicate, spam"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
      </Modal>
    </div>
  );
}

function PostCard({
  post,
  isOwn,
  endorsing,
  onEndorse,
  onBoost,
  onReport,
}: {
  post: Post;
  isOwn: boolean;
  endorsing: boolean;
  onEndorse: () => void;
  onBoost: () => void;
  onReport: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setLoadingComments(true);
      try {
        setComments(await apiClient.getPostComments(post.id));
      } catch {
        /* ignore */
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const submitComment = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    try {
      const c = await apiClient.createComment(post.id, draft.trim());
      setComments((prev) => [...prev, c]);
      setDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Comment failed");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <Avatar name={post.user.displayName} src={post.user.profileImage} />
        <div className="flex-1">
          <Link to={`/profile/${post.user.id}`} className="font-semibold hover:text-green-600">
            {post.user.displayName}
          </Link>
          <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</p>
        </div>
        <Badge color="gray">
          {plantIcon(post.plantType)}
          <span className="capitalize">{post.plantType}</span>
        </Badge>
      </div>

      <Link to={`/posts/${post.id}`} className="block p-4 hover:bg-gray-50/50 transition">
        <h3 className="font-bold text-lg mb-1">{post.title}</h3>
        {post.description && <p className="text-gray-600 text-sm mb-3">{post.description}</p>}
        {post.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {post.images.slice(0, 3).map((img) => (
              <img key={img.order} src={img.imageUrl} alt={`Photo ${img.order}`} className="w-full h-28 object-cover rounded-lg" />
            ))}
          </div>
        )}
      </Link>

      <div className="px-4 pb-3 flex items-center gap-4 flex-wrap">
        <button
          onClick={onEndorse}
          disabled={endorsing || isOwn}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-green-600 disabled:opacity-40 transition"
        >
          <Heart size={18} />
          <span>
            {post.endorsementCount} Endorse{post.endorsementCount !== 1 ? "s" : ""}
          </span>
        </button>
        <button onClick={toggleComments} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition">
          <MessageCircle size={18} />
          <span>Comment</span>
        </button>
        {isOwn ? (
          <button onClick={onBoost} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-yellow-600 transition">
            <Zap size={18} />
            <span>Boost</span>
          </button>
        ) : (
          <button onClick={onReport} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 transition ml-auto">
            <Flag size={16} />
          </button>
        )}
      </div>

      {showComments && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {loadingComments ? (
            <div className="py-4 flex justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-3 mb-3">
              {comments.length === 0 && <p className="text-sm text-gray-400">No comments yet — say something nice!</p>}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar name={c.user.displayName} src={c.user.profileImage} size="sm" />
                  <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1">
                    <p className="text-xs font-medium">{c.user.displayName}</p>
                    <p className="text-sm text-gray-700">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Add a comment…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <Button size="sm" loading={posting} onClick={submitComment} leftIcon={<Send size={14} />}>
              Send
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
