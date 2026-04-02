import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  CreditCard,
} from "lucide-react";

import VoiceButton from "../components/VoiceButton";
import { getDashboardSummary, getApiErrorMessage } from "../lib/api";
import { getSocket } from "../lib/socket";

function formatMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₹0";
  return `₹${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function StatCard({ title, value, icon: Icon, iconClass }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-md text-slate-500 font-medium">{title}</span>
        {Icon ? <Icon className={`w-4 h-4 ${iconClass || "text-slate-500"}`} /> : null}
      </div>
      <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function formatTime(d) {
  try {
    return new Date(d).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function toFeedLabel(description) {
  const raw = (description && String(description).trim()) || "";
  if (!raw) return "Customer";
  const m = raw.match(/^voice\s*:\s*([\u0900-\u097fa-zA-Z]+)/u);
  if (m && m[1]) return m[1];
  if (/^voice\s*:/i.test(raw)) return "Voice Entry";
  return raw;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rtStatus, setRtStatus] = useState("disconnected"); // connected | disconnected

  const load = async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await getDashboardSummary();
      setData(res);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Lightweight polling to keep the feed feeling "live".
    const id = setInterval(() => {
      load({ silent: true });
    }, 2000);

    const socket = getSocket();
    const handleConnect = () => setRtStatus("connected");
    const handleDisconnect = () => setRtStatus("disconnected");

    const handleTxCreated = (tx) => {
      if (tx && typeof tx === "object") {
        setData((prev) => {
          if (!prev) return prev;
          const list = Array.isArray(prev.recentPayments) ? prev.recentPayments : [];
          const next = [tx, ...list.filter((p) => p?.id !== tx.id)].slice(0, 20);
          return { ...prev, recentPayments: next };
        });
      }
      // Refresh aggregates quietly (charts/stats) after updating feed.
      load({ silent: true });
    };

    const handleUdhaarCreated = () => {
      load({ silent: true });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("transaction:created", handleTxCreated);
    socket.on("udhaar:created", handleUdhaarCreated);

    // Set initial state
    setRtStatus(socket.connected ? "connected" : "disconnected");

    return () => {
      clearInterval(id);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("transaction:created", handleTxCreated);
      socket.off("udhaar:created", handleUdhaarCreated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weeklySeries = useMemo(() => {
    const arr = data?.charts?.weeklyRevenueVsExpenses || [];
    return arr.map((x) => ({
      day: x.day,
      revenue: Number(x.revenue) || 0,
      expense: Number(x.expenses) || 0,
    }));
  }, [data]);

  const splitAmounts = data?.charts?.paymentSplit || [];

  const totalSplit = useMemo(() => {
    return splitAmounts.reduce((acc, x) => acc + (Number(x.amount) || 0), 0);
  }, [splitAmounts]);

  const split = useMemo(() => {
    if (!totalSplit) return [];
    return splitAmounts
      .map((x) => ({
        name: String(x.type),
        value: Math.round(((Number(x.amount) || 0) / totalSplit) * 100),
      }))
      .filter((x) => x.value > 0)
      .slice(0, 6);
  }, [splitAmounts, totalSplit]);

  const pieColors = ["#0ea5e9", "#1e3a8a", "#f59e0b", "#22c55e", "#a855f7", "#ef4444"];

  const stats = data?.stats;

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {loading ? (
        <div className="text-slate-600">Loading dashboard…</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Today's Revenue"
              value={formatMoney(stats?.todayRevenue)}
              icon={IndianRupee}
              iconClass="text-sky-600"
            />
            <StatCard
              title="Today's Udhaar"
              value={formatMoney(stats?.todayUdhaar)}
              icon={BookOpen}
              iconClass="text-amber-600"
            />
            <StatCard
              title="Low Stock Items"
              value={String(stats?.lowStockCount ?? 0)}
              icon={AlertTriangle}
              iconClass="text-red-600"
            />
            <StatCard
              title="Week Revenue"
              value={formatMoney(stats?.weekRevenue)}
              icon={TrendingUp}
              iconClass="text-emerald-600"
            />
          </div>

          {/* Middle charts */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-lg text-slate-900">Weekly Revenue vs Expenses</div>
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={weeklySeries} barCategoryGap={18}>
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      formatter={(v) => formatMoney(v)}
                      contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }}
                    />
                    <Bar dataKey="revenue" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" fill="#0f172a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-bold text-lg text-slate-900">Payment Split</div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={split}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {split.map((_, idx) => (
                        <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-md text-slate-600">
                {split.map((x, idx) => {
                  return (
                    <div key={x.name} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: pieColors[idx % pieColors.length] }}
                      />
                      <span className="text-slate-500">
                        {x.name} {x.value}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="font-bold text-lg text-slate-900">Live Payment Feed</div>
                  <div className="text-xs text-slate-500">
                    Realtime: <span className={rtStatus === "connected" ? "text-emerald-600 font-medium" : "text-slate-400"}>{rtStatus}</span>
                  </div>
                </div>
                <CreditCard className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-4">
                {Array.isArray(data?.recentPayments) && data.recentPayments.length ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {data.recentPayments.slice(0, 7).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg text-lg hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-slate-900 truncate">
                            {toFeedLabel(p.description)}
                          </span>
                          <span className="text-slate-500 ml-2 text-md">
                            {String(p.type || "")} • {p.createdAt ? formatTime(p.createdAt) : ""}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900">{formatMoney(p.amount)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 text-lg">No payments yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col items-center justify-center gap-4">
              <div className="font-bold text-lg text-slate-900">Voice Entry</div>
              <p className="text-md text-slate-500 text-center">Tap to add items or record sales in Hindi</p>
              <VoiceButton onProcessed={load} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
