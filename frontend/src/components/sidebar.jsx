import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
	LayoutDashboard,
	Package,
	BookOpen,
	ArrowLeftRight,
	Landmark,
	Settings,
	Menu,
	LogOut,
	Zap,
} from "lucide-react";

const links = [
	{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
	{ to: "/inventory", icon: Package, label: "Inventory" },
	{ to: "/udhaar", icon: BookOpen, label: "Udhaar" },
	{ to: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
	{ to: "/loans", icon: Landmark, label: "Loans" },
	{ to: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout() {
	const [open, setOpen] = useState(false);
	const location = useLocation();
	const currentLabel =
		links.find((l) => location.pathname.startsWith(l.to))?.label ??
		"InventoryPulse";

	const handleLogout = () => {
		localStorage.removeItem("ip_token");
		window.location.href = "/login";
	};

	const sidebar = (
		<nav className="flex flex-col h-full bg-[#061d4a] text-white">
			<div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
				<Zap className="w-7 h-7 text-sky-400" />
				<div>
					<div className="font-bold text-xl leading-tight">InventoryPulse</div>
					<div className="text-sm text-sky-300/90">Powered by Udhaar AI</div>
				</div>
			</div>

			<div className="flex-1 py-3 space-y-1 px-3">
				{links.map(({ to, icon: Icon, label }) => (
					<NavLink
						key={to}
						to={to}
						onClick={() => setOpen(false)}
						className={({ isActive }) =>
							`flex items-center gap-3 px-3 py-2.5 rounded-lg text-md font-medium transition-colors ${
								isActive
									? "bg-sky-700/30 text-white"
									: "text-slate-200 hover:bg-white/5"
							}`
						}
					>
						<Icon className="w-5 h-5" />
						<span>{label}</span>
					</NavLink>
				))}
			</div>

			<div className="p-3 border-t border-slate-800">
				<button
					onClick={handleLogout}
					className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-md font-medium w-full text-slate-200 hover:bg-red-500/10 hover:text-red-300 transition-colors"
				>
					<LogOut className="w-5 h-5" />
					<span>Logout</span>
				</button>
			</div>
		</nav>
	);

	return (
		<div className="flex min-h-screen w-full bg-slate-50">
			{/* Desktop sidebar */}
			<aside className="hidden md:flex w-60 flex-shrink-0 fixed inset-y-0 left-0 z-30">
				{sidebar}
			</aside>

			{/* Mobile overlay */}
			{open && (
				<div className="fixed inset-0 z-40 md:hidden">
					<div
						className="absolute inset-0 bg-black/40"
						onClick={() => setOpen(false)}
					/>
					<aside className="absolute inset-y-0 left-0 w-64 shadow-xl">
						{sidebar}
					</aside>
				</div>
			)}

			{/* Main */}
			<div className="flex-1 md:ml-60 pl-6 flex flex-col min-h-screen">
				<header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-3">
					<button
						onClick={() => setOpen(true)}
						className="md:hidden p-1 rounded-md hover:bg-slate-100"
					>
						<Menu className="w-6 h-6" />
					</button>
					<h1 className="text-xl font-semibold text-slate-900">{currentLabel}</h1>
				</header>

				<main className="flex-1 p-4 md:p-6 overflow-auto">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
