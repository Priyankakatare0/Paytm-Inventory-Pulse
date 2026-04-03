import { useEffect, useMemo, useState } from "react";
import {
	ArrowDownLeft,
	ArrowUpRight,
	CreditCard,
	Filter,
} from "lucide-react";

import { getTransactions, getApiErrorMessage } from "../lib/api";
import { extractPersonName } from "../lib/text";

const fmt = (n) => {
	const num = Number(n);
	if (!Number.isFinite(num)) return "₹0";
	return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

function toDateLabel(value) {
	try {
		const d = value ? new Date(value) : null;
		if (!d || Number.isNaN(d.getTime())) return "";
		return d.toISOString().slice(0, 10);
	} catch {
		return "";
	}
}

function normalizeType(raw) {
	const t = String(raw || "").trim().toLowerCase();
	if (t === "cash" || t === "upi" || t === "card") return "sale";
	if (t === "purchase") return "purchase";
	if (t === "udhaar" || t === "credit") return "udhaar";
	if (t === "udhaar_payment" || t === "udhaar received" || t === "udhaar_recv") {
		return "udhaar_payment";
	}
	if (t === "sale") return "sale";
	return "sale";
}

function methodLabel(raw) {
	const t = String(raw || "").trim();
	if (!t) return "";
	const low = t.toLowerCase();
	if (low === "cash" || low === "upi" || low === "card") return t;
	if (low === "udhaar") return "Credit";
	return t;
}

function toCustomerLabel(description) {
	const raw = (description && String(description).trim()) || "";
	if (!raw) return "Walk-in";
	const m = raw.match(/^voice\s*:\s*([\u0900-\u097fa-zA-Z]+)/u);
	if (m && m[1]) {
		return extractPersonName(m[1]);
	}
	if (/^voice\s*:/i.test(raw)) return "Voice Entry";
	return extractPersonName(raw);
}

const typeFilters = [
	{ key: "all", label: "All" },
	{ key: "sale", label: "Sale" },
	{ key: "purchase", label: "Purchase" },
	{ key: "udhaar", label: "Udhaar" },
	{ key: "udhaar_payment", label: "Udhaar Recv" },
];

const typeMeta = {
	sale: { label: "Sale", color: "text-emerald-600", icon: ArrowUpRight, badgeBg: "bg-emerald-50" },
	purchase: { label: "Purchase", color: "text-red-500", icon: ArrowDownLeft, badgeBg: "bg-red-50" },
	udhaar: { label: "Udhaar Given", color: "text-amber-500", icon: CreditCard, badgeBg: "bg-amber-50" },
	udhaar_payment: { label: "Udhaar Received", color: "text-sky-500", icon: ArrowUpRight, badgeBg: "bg-sky-50" },
};

export default function Transactions() {
	const [typeFilter, setTypeFilter] = useState("all");
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let alive = true;
		async function load() {
			setLoading(true);
			setError("");
			try {
				const res = await getTransactions({ limit: 100 });
				const list = Array.isArray(res?.items) ? res.items : [];
				if (alive) setItems(list);
			} catch (e) {
				if (alive) setError(getApiErrorMessage(e));
			} finally {
				if (alive) setLoading(false);
			}
		}
		load();
		return () => {
			alive = false;
		};
	}, []);

	const normalized = useMemo(() => {
		return items.map((t) => {
			const normType = normalizeType(t.type);
			const createdAt = t.createdAt || t.created_at || null;
			const date = toDateLabel(createdAt);
			const customer = toCustomerLabel(t.description);
			const method = methodLabel(t.type);
			return {
				...t,
				normType,
				date,
				customer,
				method,
			};
		});
	}, [items]);

	const filtered = useMemo(() => {
		if (typeFilter === "all") return normalized;
		return normalized.filter((t) => t.normType === typeFilter);
	}, [normalized, typeFilter]);

	const totalIn = useMemo(() => {
		return normalized
			.filter((t) => t.normType === "sale" || t.normType === "udhaar_payment")
			.reduce((s, t) => s + Number(t.amount || 0), 0);
	}, [normalized]);

	const totalOut = useMemo(() => {
		return normalized
			.filter((t) => t.normType === "purchase" || t.normType === "udhaar")
			.reduce((s, t) => s + Number(t.amount || 0), 0);
	}, [normalized]);

	return (
		<div className="space-y-4 max-w-4xl mx-auto">
			<div className="grid grid-cols-2 gap-3">
				<div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
					<div className="text-base text-slate-500">Money In</div>
					<div className="text-2xl font-extrabold text-emerald-600">{fmt(totalIn)}</div>
				</div>
				<div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
					<div className="text-base text-slate-500">Money Out</div>
					<div className="text-2xl font-extrabold text-red-400">{fmt(totalOut)}</div>
				</div>
			</div>

			<div className="flex items-center gap-3 overflow-x-auto pb-1">
				<Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
				{typeFilters.map((t) => (
					<button
						key={t.key}
						onClick={() => setTypeFilter(t.key)}
						className={`px-4 py-2 rounded-full text-base font-semibold whitespace-nowrap transition ${
							typeFilter === t.key
								? "bg-sky-500 text-white"
								: "bg-slate-100 text-slate-600 hover:bg-slate-200"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{error ? (
				<div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-base">
					{error}
				</div>
			) : null}

			<div className="space-y-3">
				{loading ? (
					<div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 text-lg text-slate-500">
						Loading…
					</div>
				) : null}

				{!loading && filtered.length === 0 ? (
					<div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 text-lg text-slate-500">
						No transactions.
					</div>
				) : null}

				{filtered.map((t) => {
					const meta = typeMeta[t.normType] || typeMeta.sale;
					const Icon = meta.icon;
					const sign = t.normType === "purchase" || t.normType === "udhaar" ? "-" : "+";
					const subtitle = [meta.label, t.method ? t.method : null, t.date ? t.date : null]
						.filter(Boolean)
						.join(" • ");
					return (
						<div
							key={t.id}
							className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between"
						>
							<div className="flex items-center gap-4">
								<div
									className={`w-10 h-10 rounded-full flex items-center justify-center ${meta.badgeBg} ${meta.color}`}
								>
									<Icon className="w-5 h-5" />
								</div>
								<div>
									<div className="font-bold text-slate-900">{t.customer}</div>
									<div className="text-base text-slate-500">{subtitle}</div>
								</div>
							</div>

							<div className={`font-extrabold text-lg ${meta.color}`}>
								{sign}
								{fmt(t.amount)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
