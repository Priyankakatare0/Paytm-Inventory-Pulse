import { useState } from "react";
import { X, Zap, CheckCircle2, ArrowRight } from "lucide-react";

export default function LoanCard({ loan, onClose }) {
	const [step, setStep] = useState(0);
	const [approved, setApproved] = useState(false);

	if (!loan) return null;
	if (loan.type !== "offer") return null;

	const amountText = `₹${Number(loan.amount || 0).toLocaleString("en-IN")}`;
	const interestText = loan.interest != null ? `${loan.interest}% monthly` : null;
	const tenureText = loan.tenure ? String(loan.tenure) : null;
	const steps = Array.isArray(loan.steps) ? loan.steps : [];
	const maxStep = Math.max(0, steps.length - 1);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
			<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
				<div className="bg-gradient-to-r from-[#0b2f76] to-[#0a3b8f] p-6 text-white">
					<div className="flex justify-between items-start">
						<div className="flex items-center gap-2">
							<Zap className="w-6 h-6 text-sky-200" />
							<span className="font-extrabold text-lg">{loan.title}</span>
						</div>
						<button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
							<X className="w-5 h-5" />
						</button>
					</div>
					<div className="mt-3 text-4xl font-extrabold">{amountText}</div>
					<div className="text-base opacity-90 mt-1">
						{[interestText, tenureText].filter(Boolean).join(" • ")}
					</div>
				</div>

				<div className="p-6 space-y-5">
					{loan.description ? (
						<p className="text-base text-slate-600">{loan.description}</p>
					) : null}

					{loan.aiReason ? (
						<div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
							<span className="font-bold text-sky-700">AI Insight:</span>
							<p className="mt-1 text-slate-700 text-base">{loan.aiReason}</p>
						</div>
					) : null}

					{!approved ? (
						<>
							{steps.length ? (
								<div className="space-y-3">
									<div className="text-sm font-extrabold text-slate-500 uppercase tracking-wide">
										How it works
									</div>
									{steps.map((s, i) => (
										<div
											key={i}
											className={`flex items-start gap-3 text-base transition-all ${
												i <= step ? "opacity-100" : "opacity-40"
											}`}
										>
											<div
												className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold mt-0.5 ${
												i <= step
													? "bg-sky-600 text-white"
													: "bg-slate-100 text-slate-500"
											}`}
											>
												{i + 1}
											</div>
											<span className="text-slate-700">{s}</span>
										</div>
									))}
								</div>
							) : null}

							<button
								onClick={() => {
								if (steps.length && step < maxStep) setStep(step + 1);
								else setApproved(true);
							}}
							className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3.5 rounded-xl font-extrabold text-lg flex items-center justify-center gap-2 transition"
						>
							{steps.length && step < maxStep ? (
								<>
									Next Step <ArrowRight className="w-5 h-5" />
								</>
							) : (
								"Approve Loan"
							)}
						</button>
						</>
					) : (
						<div className="text-center py-5">
							<CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
							<div className="font-extrabold text-xl text-slate-900">Loan Approved!</div>
							<p className="text-base text-slate-500 mt-1">{amountText} will be credited shortly</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
