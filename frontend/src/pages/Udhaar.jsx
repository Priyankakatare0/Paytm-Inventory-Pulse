import { useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	Bell,
	CheckCircle2,
	Clock,
	Plus,
	Phone,
	X,
} from "lucide-react";
import { createUdhaar, getUdhaar, sendUdhaarReminder, settleUdhaar } from "../lib/api";
import { getSocket } from "../lib/socket";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const tabs = ["all", "pending", "overdue", "paid"];

function maskUpiId(raw) {
	const s = String(raw || "").trim();
	if (!s) return "—";
	const at = s.indexOf("@");
	if (at <= 1) {
		if (s.length <= 4) return "***";
		return `${s.slice(0, 1)}***${s.slice(-1)}`;
	}
	const user = s.slice(0, at);
	const domain = s.slice(at + 1);
	const userMasked = user.length <= 2 ? "***" : `${user.slice(0, 2)}***`;
	const domainMasked = domain.length <= 2 ? "***" : `***${domain.slice(-2)}`;
	return `${userMasked}@${domainMasked}`;
}

function getComputedStatus(entry) {
	if (entry?.status === "paid") return "paid";
	const dueDate = entry?.dueDate ? new Date(entry.dueDate) : null;
	if (dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < new Date()) {
		return "overdue";
	}
	return "pending";
}

const statusMeta = {
	pending: { Icon: Clock, badge: "text-amber-500", label: "Pending" },
	overdue: { Icon: AlertCircle, badge: "text-red-500", label: "Overdue" },
	paid: { Icon: CheckCircle2, badge: "text-emerald-500", label: "Paid" },
};

export default function Udhaar() {
	const [tab, setTab] = useState("all");
	const [showAdd, setShowAdd] = useState(false);
	const [loading, setLoading] = useState(true);
	const [items, setItems] = useState([]);
	const [error, setError] = useState("");
		const [success, setSuccess] = useState("");

	const [form, setForm] = useState({
		customerName: "",
		upiId: "",
		amount: "",
		dueDate: "",
	});

	async function refresh() {
		setError("");
		setSuccess("");
		setLoading(true);
		try {
			const data = await getUdhaar();
			setItems(Array.isArray(data?.items) ? data.items : []);
		} catch (e) {
			setError(e?.response?.data?.error || e?.message || "Failed to load udhaar");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		refresh();
	}, []);

	useEffect(() => {
		// Safety-net polling so the list updates even if a socket event is missed.
		const id = setInterval(() => {
			refresh();
		}, 2000);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		const onUdhaarChanged = () => {
			refresh();
		};
		const socket = getSocket();

		socket.on("udhaar:created", onUdhaarChanged);
		socket.on("udhaar:updated", onUdhaarChanged);
		socket.on("udhaar:settled", onUdhaarChanged);

		return () => {
			socket.off("udhaar:created", onUdhaarChanged);
			socket.off("udhaar:updated", onUdhaarChanged);
			socket.off("udhaar:settled", onUdhaarChanged);
		};
	}, []);

	const computed = useMemo(() => {
		return items.map((it) => ({
			...it,
			computedStatus: getComputedStatus(it),
		}));
	}, [items]);

	const filtered = useMemo(() => {
		if (tab === "all") return computed;
		return computed.filter((u) => u.computedStatus === tab);
	}, [computed, tab]);

	const totalDue = useMemo(() => {
		return computed
			.filter((u) => u.computedStatus !== "paid")
			.reduce((sum, u) => sum + Number(u.amount || 0), 0);
	}, [computed]);

	async function onAdd() {
		setError("");
		const amountNum = Number(form.amount);
		if (!form.customerName.trim()) return setError("Customer name is required");
		if (!form.upiId.trim()) return setError("UPI ID is required");
		if (!Number.isFinite(amountNum) || amountNum <= 0) return setError("Enter a valid amount");

		try {
			await createUdhaar({
				customerName: form.customerName.trim(),
				upiId: form.upiId.trim(),
				amount: amountNum,
				dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
			});
			setShowAdd(false);
			setForm({ customerName: "", upiId: "", amount: "", dueDate: "" });
			await refresh();
		} catch (e) {
			setError(e?.response?.data?.error || e?.message || "Failed to create udhaar");
		}
	}

	async function onMarkPaid(id) {
		setError("");
		try {
			await settleUdhaar(id, {});
			await refresh();
		} catch (e) {
			setError(e?.response?.data?.error || e?.message || "Failed to record payment");
		}
	}

	async function onSendReminder(id) {
		setError("");
		setSuccess("");
		try {
			const res = await sendUdhaarReminder(id, { enabled: true, sendNow: true });
			if (res?.sent) {
				setSuccess("Reminder sent to your email");
			} else {
				setSuccess("Reminder scheduled (email delivery in demo mode)");
			}
			setTimeout(() => setSuccess(""), 2500);
		} catch (e) {
			setError(e?.response?.data?.error || e?.message || "Failed to send reminder");
		}
	}

	return (
		<div className="space-y-4 max-w-4xl mx-auto">
			<div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
				<div>
					<div className="text-base text-slate-500">Total Udhaar Due</div>
					<div className="text-3xl font-extrabold text-red-500">{fmt(totalDue)}</div>
				</div>
				<button
					onClick={() => setShowAdd(true)}
					className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2 rounded-xl text-base font-bold flex items-center gap-2"
				>
					<Plus className="w-5 h-5" /> New Udhaar
				</button>
			</div>

			<div className="flex gap-3 flex-wrap">
				{tabs.map((t) => (
					<button
						key={t}
						onClick={() => setTab(t)}
						className={`px-4 py-2 rounded-full text-base font-semibold capitalize transition ${
							tab === t ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
						}`}
					>
						{t}
					</button>
				))}
			</div>

			{error ? (
				<div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-base">
					{error}
				</div>
			) : null}

			{success ? (
				<div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-base">
					{success}
				</div>
			) : null}

			<div className="space-y-4">
				{loading ? (
					<div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 text-lg text-slate-500">
						Loading…
					</div>
				) : null}

				{!loading && filtered.length === 0 ? (
					<div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 text-lg text-slate-500">
						No udhaar entries.
					</div>
				) : null}

				{filtered.map((u) => {
					const meta = statusMeta[u.computedStatus] || statusMeta.pending;
					const total = Number(u.amount || 0);
					const paid = u.computedStatus === "paid" ? total : 0;
					const due = u.computedStatus === "paid" ? 0 : total;

					return (
						<div key={u.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
							<div className="flex items-start justify-between">
								<div>
									<div className="font-bold text-lg text-slate-900">{u.creditorName}</div>
									<div className="text-base text-slate-500 flex items-center gap-2 mt-1">
										<Phone className="w-4 h-4" /> {u.upiIdMasked || maskUpiId(u.upiId)}
									</div>
								</div>
								<div className={`flex items-center gap-2 text-base font-semibold ${meta.badge}`}>
									<meta.Icon className="w-4 h-4" />
									<span className="capitalize">{meta.label}</span>
								</div>
							</div>

							<div className="mt-4 flex gap-6 flex-wrap text-base">
								<div>
									<span className="text-slate-500">Total:</span> <span className="font-bold text-slate-900">{fmt(total)}</span>
								</div>
								<div>
									<span className="text-slate-500">Paid:</span> <span className="font-bold text-emerald-600">{fmt(paid)}</span>
								</div>
								<div>
									<span className="text-slate-500">Due:</span> <span className="font-bold text-red-500">{fmt(due)}</span>
								</div>
							</div>

							<div className="mt-2 text-base text-slate-500">
								{u.dueDate
									? `Due date: ${new Date(u.dueDate).toLocaleDateString("en-IN")}`
									: "Due date: —"}
							</div>

							<div className="mt-4 flex gap-3 flex-wrap">
								<button
									className="text-md bg-sky-50 text-sky-600 px-4 py-2.5 rounded-xl font-semibold hover:bg-sky-100 flex items-center gap-2"
									onClick={() => onSendReminder(u.id)}
								>
									<Bell className="w-4 h-4" /> Send Reminder
								</button>
								{u.computedStatus !== "paid" ? (
									<button
										className="text-md bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-emerald-100"
										onClick={() => onMarkPaid(u.id)}
									>
										Record Payment
									</button>
								) : null}
							</div>
						</div>
					);
				})}
			</div>

			{showAdd ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowAdd(false)} />
					<div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-slate-200">
						<div className="flex justify-between items-center mb-5">
							<h3 className="text-xl font-extrabold text-slate-900">New Udhaar Entry</h3>
							<button onClick={() => setShowAdd(false)}>
								<X className="w-6 h-6 text-slate-600" />
							</button>
						</div>

						<div className="space-y-4">
							<input
								placeholder="Customer Name"
								value={form.customerName}
								onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
								className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
							/>
							<input
								placeholder="UPI ID (e.g. name@bank)"
								value={form.upiId}
								onChange={(e) => setForm((p) => ({ ...p, upiId: e.target.value }))}
								className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
							/>
							<input
								placeholder="Amount (₹)"
								inputMode="decimal"
								value={form.amount}
								onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
								className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
							/>
							<input
								type="date"
								value={form.dueDate}
								onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
								className="w-full h-12 px-5 rounded-2xl border border-slate-200 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
							/>
						</div>

						<button
							type="button"
							onClick={onAdd}
							className="w-full bg-sky-500 hover:bg-sky-600 text-white h-12 rounded-2xl font-extrabold text-lg mt-6"
						>
							Add Udhaar
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}
