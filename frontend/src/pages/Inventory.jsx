import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

import {
  createInventoryItem,
  deleteInventoryItem,
  getApiErrorMessage,
  getInventory,
  updateInventoryItem,
} from "../lib/api";

const fmt = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "₹0";
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const inventoryCategories = ["All", "Grocery", "Dairy", "Snacks", "Home Care", "Beverages"];
const categoryOptions = inventoryCategories.filter((c) => c !== "All");

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
  const [showEdit, setShowEdit] = useState(false);
  const [editItem, setEditItem] = useState(null);
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
  const [editForm, setEditForm] = useState({
    name: "",
	category: "",
    quantity: "",
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
	  const category = it.category ? String(it.category) : guessCategory(it.name);
      const daysLeft = Number(it.daysLeft);
      const threshold = Number(it.lowStockThreshold);
      const lowByThreshold = Number.isFinite(threshold) && threshold > 0 ? Number(it.quantity) < threshold : false;
      const lowByDaysLeft = Number.isFinite(daysLeft) ? daysLeft < 3 : false;
      const low = lowByThreshold || lowByDaysLeft;
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
			category: form.category || undefined,
        quantity: Number(form.quantity),
        price: Number(form.price),
			lowStockThreshold: form.lowStockThreshold === "" ? undefined : Number(form.lowStockThreshold),
      });
      setShowAdd(false);
      setForm({
        name: "",
        category: "Grocery",
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

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      name: String(item?.name || ""),
		category: String(item?.category || "Grocery"),
      quantity: String(item?.quantity ?? ""),
      price: String(item?.price ?? ""),
      lowStockThreshold: String(item?.lowStockThreshold ?? ""),
    });
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!editItem?.id) return;
    setSaving(true);
    setError("");
    try {
      await updateInventoryItem(editItem.id, {
        name: editForm.name,
			category: editForm.category || undefined,
        quantity: Number(editForm.quantity),
        price: Number(editForm.price),
        lowStockThreshold: editForm.lowStockThreshold === "" ? undefined : Number(editForm.lowStockThreshold),
      });
      setShowEdit(false);
      setEditItem(null);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!item?.id) return;
    const ok = window.confirm(`Delete "${item.name}"?`);
    if (!ok) return;

    setSaving(true);
    setError("");
    try {
      await deleteInventoryItem(item.id);
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
				<th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
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
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(item)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                  disabled={saving}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100"
                  disabled={saving}
                >
                  Delete
                </button>
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

    {/* Edit Modal */}
    {showEdit ? (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="text-lg font-extrabold text-slate-900">Edit Item</div>
            <button
              onClick={() => {
                setShowEdit(false);
                setEditItem(null);
              }}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500">Name</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Category</label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                className="mt-1 w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500">Quantity</label>
                <input
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="mt-1 w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Price</label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                  className="mt-1 w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Low Stock Threshold</label>
                <input
                  type="number"
                  value={editForm.lowStockThreshold}
                  onChange={(e) => setEditForm((p) => ({ ...p, lowStockThreshold: e.target.value }))}
                  className="mt-1 w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowEdit(false);
                  setEditItem(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-sky-500 text-white hover:bg-sky-600"
                disabled={saving}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null}

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
              <select
					value={form.category || "Grocery"}
					onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
					className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
				>
					{categoryOptions.map((c) => (
						<option key={c} value={c}>
							{c}
						</option>
					))}
				</select>
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