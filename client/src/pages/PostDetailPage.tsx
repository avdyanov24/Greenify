import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, TreePine, Flower2, Leaf, Send, MapPin } from "lucide-react";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Button, Card, Badge, Avatar, Spinner, toast } from "../components/ui";

interface Endorsement {
  id: string;
  endorser: { id: string; displayName: string | null; profileImage: string | null };
}

interface PostDetail {
  id: string;
  title: string;
  description: string | null;
  plantType: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  endorsementCount: number;
  images: { imageUrl: string; order: number }[];
  user: { id: string; username: string; displayName: string | null; profileImage: string | null };
  endorsements: Endorsement[];
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; displayName: string | null; profileImage: string | null };
}

function plantIcon(type: string) {
  if (type === "tree") return <TreePine size={13} className="text-green-700" />;
  if (type === "flower") return <Flower2 size={13} className="text-pink-500" />;
  return <Leaf size={13} className="text-green-500" />;
}

const PHOTO_LABELS = ["Seed / seedling", "Being placed", "Buried & watered"];

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [endorsing, setEndorsing] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    if (!postId) return;
    try {
      const [p, c] = await Promise.all([apiClient.getPost(postId), apiClient.getPostComments(postId)]);
      setPost(p);
      setComments(c);
    } catch {
      toast.error("Could not load post");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size={32} />
      </div>
    );
  }
  if (!post) return <div className="py-16 text-center text-red-500">Post not found</div>;

  const isOwn = post.user.id === user?.id;

  const endorse = async () => {
    setEndorsing(true);
    try {
      await apiClient.endorsePost(post.id);
      toast.success("Endorsed!");
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not endorse");
    } finally {
      setEndorsing(false);
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
    <div className="w-full max-w-4xl mx-auto py-4 md:py-8 px-2 md:px-4">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
        ← Back
      </button>

      <Card padding="lg" className="mb-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Avatar name={post.user.displayName} src={post.user.profileImage} />
          <div className="flex-1 min-w-0">
            <Link to={`/profile/${post.user.id}`} className="font-semibold hover:text-green-600">
              {post.user.displayName || post.user.username}
            </Link>
            <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
          </div>
          <Badge color="gray" className="shrink-0">
            {plantIcon(post.plantType)}
            <span className="capitalize">{post.plantType}</span>
          </Badge>
        </div>

        <h1 className="text-xl md:text-2xl font-bold mb-1">{post.title}</h1>
        {post.description && <p className="text-gray-600 mb-4">{post.description}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {post.images.map((img, i) => (
            <figure key={img.order}>
              <img src={img.imageUrl} alt={PHOTO_LABELS[i]} className="w-full h-32 object-cover rounded-lg" />
              <figcaption className="text-[10px] text-gray-400 text-center mt-1">{PHOTO_LABELS[i] || `Photo ${img.order}`}</figcaption>
            </figure>
          ))}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <MapPin size={13} /> {post.latitude.toFixed(4)}, {post.longitude.toFixed(4)}
          </span>
          <Button size="sm" leftIcon={<Heart size={15} />} disabled={isOwn || endorsing} loading={endorsing} onClick={endorse}>
            Endorse ({post.endorsementCount})
          </Button>
        </div>
      </Card>

      {post.endorsements.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-bold text-sm mb-3">Endorsed by</h2>
          <div className="flex flex-wrap gap-3">
            {post.endorsements.map((e) => (
              <Link key={e.id} to={`/profile/${e.endorser.id}`} className="flex items-center gap-2 text-sm hover:text-green-600">
                <Avatar name={e.endorser.displayName} src={e.endorser.profileImage} size="sm" />
                {e.endorser.displayName}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-bold mb-4">Comments ({comments.length})</h2>
        <div className="space-y-3 mb-4">
          {comments.length === 0 && <p className="text-sm text-gray-400">No comments yet.</p>}
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
      </Card>
    </div>
  );
}
