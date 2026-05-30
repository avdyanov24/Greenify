import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Spinner } from "../components/ui";

interface Profile {
  id: string;
  displayName: string;
  username: string;
  bio: string | null;
  profileImage: string | null;
  level: number;
  xp: number;
  greenPoints: number;
  hexCount: number;
  posts: { id: string; title: string; plantType: string; images: { imageUrl: string }[]; endorsementCount: number; createdAt: string }[];
  achievements: { slug: string; name: string; description: string; icon: string | null }[];
}

function LevelBar({ level, xp }: { level: number; xp: number }) {
  const thresholds = [0, 100, 300, 600, 1000, Infinity];
  const next = thresholds[level] ?? Infinity;
  const prev = thresholds[level - 1] ?? 0;
  const pct = next === Infinity ? 100 : Math.min(100, ((xp - prev) / (next - prev)) * 100);

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Level {level}</span>
        {next !== Infinity && <span>{xp} / {next} XP</span>}
      </div>
      <div className="h-2 bg-gray-200 rounded-full">
        <div className="h-2 bg-green-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    apiClient.getProfile(userId)
      .then(setProfile)
      .catch(() => setError("Profile not found"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size={32} />
      </div>
    );
  }
  if (error || !profile) return <div className="py-16 text-center text-red-500">{error || "Profile not found"}</div>;

  const isOwn = currentUser?.id === profile.id;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-md p-8 mb-8">
        <div className="flex gap-6 items-start">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-3xl shrink-0">
            {(profile.displayName || profile.username)[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{profile.displayName || profile.username}</h1>
            <p className="text-gray-500 text-sm">@{profile.username}</p>
            {profile.bio && <p className="text-gray-600 mt-2">{profile.bio}</p>}

            <div className="grid grid-cols-4 gap-4 my-4">
              {[
                { label: "Level", value: profile.level, color: "text-green-700" },
                { label: "Green Points", value: profile.greenPoints, color: "text-amber-600" },
                { label: "Hexes", value: profile.hexCount, color: "text-green-700" },
                { label: "Posts", value: profile.posts.length, color: "text-gray-800" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <LevelBar level={profile.level} xp={profile.xp} />
            </div>

            {isOwn && (
              <Link
                to="/profile/edit"
                className="inline-block px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Edit Profile
              </Link>
            )}
          </div>
        </div>
      </div>

      {profile.achievements.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Achievements</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {profile.achievements.map((a) => (
              <div key={a.slug} className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-100">
                <div className="text-3xl mb-2">{a.icon || "🏆"}</div>
                <p className="font-semibold text-sm">{a.name}</p>
                <p className="text-xs text-gray-500 mt-1">{a.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold mb-4">Planting Portfolio</h2>
        {profile.posts.length === 0 ? (
          <p className="text-gray-500">No approved posts yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {profile.posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                {post.images[0] ? (
                  <img src={post.images[0].imageUrl} alt={post.title} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-green-50 flex items-center justify-center text-green-400 text-3xl">🌱</div>
                )}
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{post.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{post.plantType}</p>
                  <p className="text-xs text-gray-400 mt-1">{post.endorsementCount} endorsements</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
