import { useEffect, useState } from "react";
import { Award, Lock } from "lucide-react";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Card, Badge, Spinner } from "../components/ui";

interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
}

export default function AchievementsPage() {
  const user = useAuthStore((s) => s.user);
  const [all, setAll] = useState<Achievement[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([apiClient.getAchievements(), apiClient.getUserAchievements(user.id)])
      .then(([defs, mine]) => {
        setAll(defs);
        setUnlocked(new Set(mine.map((m: { achievement: Achievement }) => m.achievement.slug)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  const unlockedCount = all.filter((a) => unlocked.has(a.slug)).length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Award className="text-green-700" size={28} />
          <h1 className="text-3xl font-bold">Achievements</h1>
        </div>
        <Badge color="green">
          {unlockedCount} / {all.length} unlocked
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {all.map((a) => {
          const has = unlocked.has(a.slug);
          return (
            <Card key={a.slug} className={`text-center relative ${has ? "" : "opacity-60"}`}>
              {!has && (
                <span className="absolute top-3 right-3 text-gray-300">
                  <Lock size={16} />
                </span>
              )}
              <div className={`text-4xl mb-2 ${has ? "" : "grayscale"}`}>{a.icon || "🏆"}</div>
              <p className="font-semibold text-sm">{a.name}</p>
              <p className="text-xs text-gray-500 mt-1">{a.description}</p>
              {has && (
                <Badge color="green" className="mt-2">
                  Unlocked
                </Badge>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
