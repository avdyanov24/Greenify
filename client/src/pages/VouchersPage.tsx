import { useEffect, useState } from "react";
import { Gift, Coins, Ticket } from "lucide-react";
import { apiClient } from "../services/api";
import { useAuthStore } from "../utils/store";
import { Button, Card, Badge, Modal, Spinner, EmptyState, toast } from "../components/ui";

interface Voucher {
  id: string;
  code: string;
  organizationName: string;
  organizationDescription: string | null;
  gpValue: number;
  description: string;
}

interface MyVoucher {
  id: string;
  status: string;
  createdAt: string;
  voucher: Voucher;
}

export default function VouchersPage() {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [mine, setMine] = useState<MyVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<Voucher | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const load = async () => {
    try {
      const [v, m] = await Promise.all([apiClient.getVouchers(), apiClient.getMyVouchers()]);
      setVouchers(v);
      setMine(m);
    } catch {
      toast.error("Could not load vouchers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRedeem = async () => {
    if (!confirm) return;
    setRedeeming(true);
    try {
      await apiClient.redeemVoucher(confirm.id);
      toast.success(`Redeemed ${confirm.organizationName} voucher`);
      setConfirm(null);
      await Promise.all([refreshUser(), load()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Redemption failed");
    } finally {
      setRedeeming(false);
    }
  };

  const balance = user?.greenPoints ?? 0;

  return (
    <div className="w-full max-w-6xl mx-auto py-4 md:py-8 px-2 md:px-4">
      <div className="flex items-end justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Voucher Store</h1>
        <Badge color="yellow">
          <Coins size={13} /> {balance} GP available
        </Badge>
      </div>
      <p className="text-gray-500 mb-8">Redeem your Green Points for charity and eco-partner benefits.</p>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size={32} />
        </div>
      ) : (
        <>
          {vouchers.length === 0 ? (
            <EmptyState icon={<Gift size={48} />} title="No vouchers available yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {vouchers.map((v) => {
                const affordable = balance >= v.gpValue;
                return (
                  <Card key={v.id} className="flex flex-col">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                        <Gift size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold leading-tight">{v.organizationName}</h3>
                        {v.organizationDescription && (
                          <p className="text-xs text-gray-400">{v.organizationDescription}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 flex-1">{v.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xl font-bold text-green-600">{v.gpValue} GP</span>
                      <Button size="sm" disabled={!affordable} onClick={() => setConfirm(v)}>
                        {affordable ? "Redeem" : "Not enough GP"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {mine.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold mb-4">My Redeemed Vouchers</h2>
              <div className="space-y-3">
                {mine.map((m) => (
                  <Card key={m.id} padding="sm" className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Ticket size={20} className="text-green-600" />
                      <div>
                        <p className="font-medium text-sm">{m.voucher.organizationName}</p>
                        <p className="text-xs text-gray-500">{m.voucher.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{m.voucher.code}</code>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Confirm redemption"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button loading={redeeming} onClick={handleRedeem}>
              Redeem for {confirm?.gpValue} GP
            </Button>
          </>
        }
      >
        {confirm && (
          <p className="text-sm text-gray-600">
            Redeem the <span className="font-semibold">{confirm.organizationName}</span> voucher for{" "}
            <span className="font-semibold text-green-600">{confirm.gpValue} GP</span>? Your balance will drop to{" "}
            {balance - confirm.gpValue} GP.
          </p>
        )}
      </Modal>
    </div>
  );
}
