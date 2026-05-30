import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Coins, Hexagon, Sparkles } from "lucide-react";
import { apiClient } from "../services/api";
import { Card, Avatar, Badge, Spinner, EmptyState } from "../components/ui";

interface Row {
  id: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  level: number;
  xp: number;
  greenPoints: number;
  hexCount: number;
}

type Sort = "gp" | "hexes" | "xp";

const TABS: { key: Sort; label: string; icon: typeof Coins }[] = [
  { key: "gp", label: "Green Points", icon: Coins },
  { key: "hexes", label: "Hexes", icon: Hexagon },
  { key: "xp", label: "XP", icon: Sparkles },
];

export default function LeaderboardPage() {
  const [sort, setSort] = useState<Sort>("gp");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient
      .getLeaderboard(sort)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [sort]);

  const metric = (r: Row) => (sort === "gp" ? `${r.greenPoints} GP` : sort === "hexes" ? `${r.hexCount} hexes` : `${r.xp} XP`);
  const medal = (i: number) => (i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-300");

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="text-yellow-500" size={28} />
        <h1 className="text-3xl font-bold">Leaderboard</h1>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSort(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-1.5 ${
              sort === t.key ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size={32} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Trophy size={48} />} title="No rankings yet" />
      ) : (
        <Card padding="none">
          <div className="divide-y divide-gray-50">
            {rows.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`w-7 text-center font-bold ${medal(i)}`}>{i + 1}</span>
                <Avatar name={r.displayName || r.username} src={r.profileImage} size="sm" />
                <Link to={`/profile/${r.id}`} className="flex-1 min-w-0 font-medium hover:text-green-600">
                  {r.displayName || r.username}
                  <span className="text-xs text-gray-400 ml-2">Lv {r.level}</span>
                </Link>
                <Badge color={i < 3 ? "green" : "gray"}>{metric(r)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
