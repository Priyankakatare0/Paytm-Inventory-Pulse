import { useEffect, useMemo, useState } from "react";
import { User, Bell, Volume2, Globe, Trash2 } from "lucide-react";

const DEFAULT_NOTIFICATIONS = {
	lowStock: true,
	udhaarReminder: true,
	dailySummary: true,
	loanOffers: true,
	soundbox: false,
};

function getMerchantFromStorage() {
	try {
		const raw = localStorage.getItem("ip_merchant");
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export default function SettingsPage() {
	const merchant = useMemo(() => getMerchantFromStorage(), []);
	const [language, setLanguage] = useState("en");
	const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

	useEffect(() => {
		try {
			const saved = localStorage.getItem("ip_settings_notifications");
			if (saved) setNotifications(JSON.parse(saved));
		} catch {
			// ignore
		}
		try {
			const savedLang = localStorage.getItem("ip_settings_language");
			if (savedLang) setLanguage(savedLang);
		} catch {
			// ignore
		}
	}, []);

	useEffect(() => {
		localStorage.setItem("ip_settings_notifications", JSON.stringify(notifications));
	}, [notifications]);

	useEffect(() => {
		localStorage.setItem("ip_settings_language", language);
	}, [language]);

	const toggle = (key) => {
		setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const profileRows = [
		["Store Name", merchant?.name || "—"],
		["Owner", merchant?.name || "—"],
		["Phone", merchant?.phone || "—"],
		["Address", "Shop 12, MG Road, Indore, MP"],
		["GST", "23AABCS1234H1Z5"],
	];

	return (
		<div className="space-y-6 max-w-4xl mx-auto">
			{/* Profile */}
			<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
				<div className="flex items-center gap-3 mb-5">
					<User className="w-6 h-6 text-sky-500" />
					<h3 className="text-lg font-extrabold text-slate-900">Store Profile</h3>
				</div>
				<div className="grid gap-4 text-base">
					{profileRows.map(([label, value]) => (
						<div key={label} className="flex items-center justify-between gap-6">
							<span className="text-slate-500">{label}</span>
							<span className="font-semibold text-slate-900 text-right">{value}</span>
						</div>
					))}
				</div>
			</div>

			{/* Notifications */}
			<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
				<div className="flex items-center gap-3 mb-5">
					<Bell className="w-6 h-6 text-sky-500" />
					<h3 className="text-lg font-extrabold text-slate-900">Notifications</h3>
				</div>
				<div className="space-y-4">
					{[
						["lowStock", "Low Stock"],
						["udhaarReminder", "Udhaar Reminder"],
						["dailySummary", "Daily Summary"],
						["loanOffers", "Loan Offers"],
						["soundbox", "Soundbox"],
					].map(([key, label]) => {
						const val = Boolean(notifications[key]);
						return (
							<div key={key} className="flex items-center justify-between">
								<span className="text-base text-slate-700">{label}</span>
								<button
									onClick={() => toggle(key)}
									className={`w-12 h-7 rounded-full transition-colors relative ${
										val ? "bg-sky-500" : "bg-slate-200"
									}`}
									aria-label={`Toggle ${label}`}
								>
									<div
										className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
											val ? "translate-x-5" : "translate-x-0.5"
										}`}
									/>
								</button>
							</div>
						);
					})}
				</div>
			</div>

			{/* Soundbox */}
			<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
				<div className="flex items-center gap-3 mb-4">
					<Volume2 className="w-6 h-6 text-sky-500" />
					<h3 className="text-lg font-extrabold text-slate-900">Soundbox Connection</h3>
				</div>
				<p className="text-base text-slate-500 mb-4">
					Connect your payment soundbox for audio confirmations
				</p>
				<button className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-3 rounded-xl text-base font-bold">
					Connect Soundbox
				</button>
			</div>

			{/* Language */}
			<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
				<div className="flex items-center gap-3 mb-4">
					<Globe className="w-6 h-6 text-sky-500" />
					<h3 className="text-lg font-extrabold text-slate-900">Language</h3>
				</div>
				<div className="flex gap-3 flex-wrap">
					{[
						["hi", "हिंदी"],
						["en", "English"],
						["mr", "मराठी"],
					].map(([code, label]) => (
						<button
							key={code}
							onClick={() => setLanguage(code)}
							className={`px-5 py-3 rounded-xl text-base font-bold transition ${
								language === code
									? "bg-sky-500 text-white"
									: "bg-slate-100 text-slate-600 hover:bg-slate-200"
							}`}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{/* Danger Zone */}
			<div className="bg-red-50 border border-red-200 rounded-2xl p-6">
				<div className="flex items-center gap-3 mb-3">
					<Trash2 className="w-6 h-6 text-red-600" />
					<h3 className="text-lg font-extrabold text-red-700">Danger Zone</h3>
				</div>
				<p className="text-base text-slate-600 mb-4">
					Permanently delete all local app data (token, settings). This cannot be undone.
				</p>
				<button
					onClick={() => {
						localStorage.removeItem("ip_token");
						localStorage.removeItem("ip_merchant");
						localStorage.removeItem("ip_settings_notifications");
						localStorage.removeItem("ip_settings_language");
						window.location.href = "/login";
					}}
					className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl text-base font-bold"
				>
					Delete All Data
				</button>
			</div>
		</div>
	);
}
