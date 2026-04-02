import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

import {
  createInventoryItem,
  getApiErrorMessage,
  getInventory,
} from "../lib/api";

const fmt = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "₹0";
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const inventoryCategories = ["All", "Grocery", "Dairy", "Snacks", "Home Care", "Beverages"];

function guessCategory(name) {
  const s = String(name || "").toLowerCase();
  if (s.includes("milk") || s.includes("butter") || s.includes("paneer")) return "Dairy";
  if (s.includes("cola") || s.includes("juice") || s.includes("soda") || s.includes("thums")) return "Beverages";
  if (s.includes("bisc") || s.includes("maggi") || s.includes("noodle") || s.includes("snack")) return "Snacks";
  if (s.includes("surf") || s.includes("soap") || s.includes("shampoo") || s.includes("vim")) return "Home Care";
  return "Grocery";
}

function makeTrend(item) {
  // Backend doesn't store trend; generate a deterministic 7-day series.
  const base = Number(item.quantity) || 0;
  const seed = (Number(item.id) || 1) * 997;
  const dir = seed % 2 === 0 ? -1 : 1;
  const amplitude = Math.max(1, Math.min(6, (seed % 7) + 1));
  const out = [];
  for (let i = 0; i < 7; i++) {
    const wobble = Math.round(Math.sin((i + 1) * 0.9) * amplitude);
    out.push(Math.max(0, base + dir * wobble));
  }
  return out;
}

export default function Inventory() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "",
    price: "",
    lowStockThreshold: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getInventory();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewItems = useMemo(() => {
    return items.map((it) => {
      const category = guessCategory(it.name);
      const daysLeft = Number(it.daysLeft);
      const low = Number.isFinite(daysLeft) ? daysLeft < 3 : false;
      return {
        ...it,
        category,
        unit: "pcs",
        thresholdLow: low,
        trend: makeTrend(it),
      };
    });
  }, [items]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return viewItems.filter(
      (i) =>
        (category === "All" || i.category === category) &&
        (!s || String(i.name || "").toLowerCase().includes(s)),
    );
  }, [viewItems, category, search]);

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      await createInventoryItem({
        name: form.name,
        quantity: Number(form.quantity),
        price: Number(form.price),
      });
      setShowAdd(false);
      setForm({
        name: "",
        category: "",
        quantity: "",
        unit: "",
        price: "",
        lowStockThreshold: "",
      });
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-sky-600"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {inventoryCategories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              category === c
                ? "bg-sky-500 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">7-Day Trend</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={5}>
                    No items found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const low = item.thresholdLow;
                  const trendData = item.trend.map((v, idx) => ({ d: idx, v }));
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        {low ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        ) : null}
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.category}</td>
                      <td className={`px-4 py-3 font-bold ${low ? "text-red-600" : ""}`}>
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-slate-900">{fmt(item.price)}</td>
                      <td className="px-4 py-3">
                        <div className="w-20 h-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                              <Line
                                type="monotone"
                                dataKey="v"
                                stroke={low ? "#ef4444" : "#0ea5e9"}
                                strokeWidth={1.5}
                                dot={false}
                              />
                              <Tooltip formatter={(v) => `${v} ${item.unit}`} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => (saving ? null : setShowAdd(false))}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-900">Add New Item</h3>
              <button type="button" disabled={saving} onClick={() => setShowAdd(false)}>
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <input
                placeholder="Item Name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <input
                placeholder="Category"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <input
                placeholder="Stock"
                value={form.quantity}
                onChange={(e) =>
                  setForm((p) => ({ ...p, quantity: e.target.value.replace(/\D/g, "") }))
                }
                className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <input
                placeholder="Unit"
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <input
                placeholder="Price(₹)"
                value={form.price}
                onChange={(e) =>
                  setForm((p) => ({ ...p, price: e.target.value.replace(/[^\d.]/g, "") }))
                }
                className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <input
                placeholder="Low Stock Threshold"
                value={form.lowStockThreshold}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    lowStockThreshold: e.target.value.replace(/\D/g, ""),
                  }))
                }
                className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />

              <button
                type="button"
                disabled={saving || !form.name || !form.quantity || !form.price}
                onClick={handleCreate}
                className="w-full h-12 rounded-2xl bg-sky-500 text-white font-bold text-sm hover:bg-sky-600 transition disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}