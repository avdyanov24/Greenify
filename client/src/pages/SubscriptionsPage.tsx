import { useEffect, useState } from "react";
import { Check, X, Crown, Zap } from "lucide-react";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Button, Card, Badge, Spinner, toast } from "../components/ui";

interface Subscription {
  type: string;
  status: string;
  currentPeriodEnd: string;
}

type Tier = "free" | "pro" | "max";

const PLANS: {
  tier: Tier;
  name: string;
  price: string;
  tagline: string;
  icon: typeof Crown | null;
  features: { label: string; included: boolean }[];
}[] = [
  {
    tier: "free",
    name: "Free",
    price: "€0",
    tagline: "Access all core features",
    icon: null,
    features: [
      { label: "Create posts & earn GP", included: true },
      { label: "Participate in the marketplace", included: true },
      { label: "Post boosts", included: false },
      { label: "XP / GP multipliers", included: false },
    ],
  },
  {
    tier: "pro",
    name: "PRO",
    price: "€4.99",
    tagline: "Boost your visibility",
    icon: Zap,
    features: [
      { label: "Everything in Free", included: true },
      { label: "Profile boost in marketplace", included: true },
      { label: "Auto-promote all posts", included: true },
      { label: "XP / GP multipliers", included: false },
    ],
  },
  {
    tier: "max",
    name: "MAX",
    price: "€9.99",
    tagline: "Ultimate acceleration",
    icon: Crown,
    features: [
      { label: "Everything in PRO", included: true },
      { label: "1.5× XP multiplier", included: true },
      { label: "1.5× GP multiplier", included: true },
      { label: "Exclusive MAX badge", included: true },
    ],
  },
];

export default function SubscriptionsPage() {
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Tier | "cancel" | null>(null);

  const load = async () => {
    try {
      const data = await apiClient.getMySubscription();
      setSub(data.subscription);
    } catch {
      /* not subscribed */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const current: Tier = sub?.status === "active" ? (sub.type as Tier) : "free";

  const handleSubscribe = async (tier: Tier) => {
    if (tier === "free") return;
    setBusy(tier);
    try {
      await apiClient.subscribe(tier);
      toast.success(`You're now on ${tier.toUpperCase()}!`);
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Subscription failed");
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    setBusy("cancel");
    try {
      await apiClient.cancelSubscription();
      toast.success("Subscription cancelled");
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setBusy(null);
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
    <div className="w-full max-w-6xl mx-auto py-4 md:py-8 px-2 md:px-4">
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">Greenify Subscriptions</h1>
      <p className="text-center text-gray-500 mb-3 text-sm md:text-base">Support the platform and accelerate your impact.</p>
      <p className="text-center text-xs text-gray-400 mb-8 md:mb-10">
        Demo mode — checkout is mocked, no payment is taken.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {PLANS.map((plan) => {
          const isCurrent = current === plan.tier;
          const Icon = plan.icon;
          return (
            <Card
              key={plan.tier}
              padding="lg"
              className={`relative flex flex-col ${plan.tier === "pro" ? "border-2 border-green-700 shadow-md" : ""}`}
            >
              {plan.tier === "pro" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge color="green">Most popular</Badge>
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                {Icon && <Icon size={20} className="text-green-600" />}
                <h3 className="text-2xl font-bold">{plan.name}</h3>
              </div>
              <p className="text-gray-500 text-sm mb-4">{plan.tagline}</p>
              <p className="text-3xl font-bold mb-6">
                {plan.price}
                {plan.tier !== "free" && <span className="text-base font-normal text-gray-400">/mo</span>}
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <Check size={16} className="text-green-600 shrink-0" />
                    ) : (
                      <X size={16} className="text-gray-300 shrink-0" />
                    )}
                    <span className={f.included ? "text-gray-700" : "text-gray-400"}>{f.label}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="secondary" fullWidth disabled>
                  Current plan
                </Button>
              ) : plan.tier === "free" ? (
                <Button
                  variant="outline"
                  fullWidth
                  loading={busy === "cancel"}
                  onClick={handleCancel}
                >
                  Downgrade to Free
                </Button>
              ) : (
                <Button fullWidth loading={busy === plan.tier} onClick={() => handleSubscribe(plan.tier)}>
                  {current === "free" ? "Subscribe" : `Switch to ${plan.name}`}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {sub?.status === "active" && (
        <p className="text-center text-sm text-gray-500 mt-8">
          Your {sub.type.toUpperCase()} plan renews on {new Date(sub.currentPeriodEnd).toLocaleDateString()}.
        </p>
      )}
    </div>
  );
}
