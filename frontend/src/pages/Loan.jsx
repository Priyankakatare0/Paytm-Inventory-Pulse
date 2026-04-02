import { useEffect, useMemo, useState } from "react";
import { Zap, CheckCircle2, Clock, Landmark } from "lucide-react";
import LoanCard from "../components/LoanCard";
import { getSocket } from "../lib/socket";
import { getApiErrorMessage, getInventory } from "../lib/api";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function clampNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function computeDaysLeft(quantity, dailyRate) {
  const q = clampNumber(quantity, 0);
  const rate = clampNumber(dailyRate, 0);
  if (rate <= 0) return Infinity;
  return q / rate;
}

function buildRestockOfferFromInventory(items) {
  const targetDays = 7; // keep 7-day buffer
  const suggestions = [];

  for (const item of Array.isArray(items) ? items : []) {
    const dailyRate = clampNumber(item?.dailyRate ?? item?.daily_rate ?? item?.depletion_rate, 0);
    const quantity = clampNumber(item?.quantity, 0);
    const price = clampNumber(item?.price, 0);
    if (dailyRate <= 0 || price <= 0) continue;
    const daysLeft = computeDaysLeft(quantity, dailyRate);
    const targetStock = dailyRate * targetDays;
    const gapUnits = Math.max(0, Math.ceil(targetStock - quantity));
    const amount = gapUnits * price;
    if (amount <= 0) continue;
    suggestions.push({
      id: item?.id,
      name: String(item?.name || "Item"),
      daysLeft,
      gapUnits,
      amount,
    });
  }

  // Prioritize items with lowest daysLeft
  suggestions.sort((a, b) => (a.daysLeft - b.daysLeft) || (b.amount - a.amount));

  const top = suggestions.slice(0, 5);
  const totalAmount = Math.round(
    top.reduce((sum, x) => sum + clampNumber(x.amount, 0), 0)
  );

  const count = top.length;
  const names = top.map((x) => x.name);
  return { totalAmount, count, names };
}

export default function Loan() {
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [liveOffer, setLiveOffer] = useState(null);
	const [inventoryOffer, setInventoryOffer] = useState(null);
	const [activeLoans, setActiveLoans] = useState([]);

  useEffect(() => {
    const socket = getSocket();
    const onLowStock = (payload) => {
      if (!payload || typeof payload !== "object") return;

		// When stock goes low, recompute the restock offer from inventory (more accurate than a single-item payload)
		setInventoryOffer(null);
		(async () => {
			try {
				const items = await getInventory();
				const computed = buildRestockOfferFromInventory(items);
				setInventoryOffer(computed);
			} catch (_) {
				// ignore
			}
		})();
    };

    socket.on("low_stock", onLowStock);
    return () => {
      socket.off("low_stock", onLowStock);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const items = await getInventory();
        const computed = buildRestockOfferFromInventory(items);
        setInventoryOffer(computed);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to load inventory for loan offer", getApiErrorMessage(e));
      }
    })();
  }, []);

  function addActiveLoanFromOffer(offer) {
    const amount = clampNumber(offer?.amount, 0);
    if (amount <= 0) return;
    const emiTotal = clampNumber(offer?.emiTotal, 6);
    const emiAmount = clampNumber(offer?.emiAmount, Math.max(1, Math.round(amount / emiTotal)));
    setActiveLoans((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      next.unshift({
        id: `active-${Date.now()}`,
        type: "active",
        title: offer?.title || "Active Loan",
        amount,
        emiAmount,
        emiPaid: 0,
        emiTotal,
        remaining: Math.max(0, Math.round(amount)),
      });
      return next.slice(0, 3);
    });
  }

  const loans = useMemo(() => {
    const offerAmount = clampNumber(inventoryOffer?.totalAmount, 0);
    const offerCount = clampNumber(inventoryOffer?.count, 0);
    const offerNames = Array.isArray(inventoryOffer?.names) ? inventoryOffer.names : [];
    const defaultOffer = {
      id: "offer-1",
      type: "offer",
      title: "Restock Loan",
      amount: offerAmount || 5000,
      interest: 1.5,
      tenure: "3 months",
      description:
			offerCount > 0
				? `AI detected low stock risk for ${offerCount} item(s). Restock now with easy EMI.`
				: "AI restock suggestion based on your inventory.",
      aiReason:
			offerNames.length
				? `Suggested buffer restock for: ${offerNames.slice(0, 3).join(", ")}. Amount is calculated from item price × units needed for ~7 days.`
				: "Amount is calculated from item price × units needed for ~7 days buffer.",
      steps: [
        "AI analyzes your inventory velocity",
        "Instant approval based on store history",
        "Amount credited to your account",
        "Auto-deduct EMI from daily sales",
      ],
      emiTotal: 6,
		emiAmount: Math.max(1, Math.round((offerAmount || 5000) / 6)),
    };

    const base = [
      ...activeLoans,
      {
        id: "active-1",
        type: "active",
        title: "Festival Stock Loan",
        amount: 15000,
        emiAmount: 2100,
        emiPaid: 3,
        emiTotal: 8,
        remaining: 10500,
      },
      {
        id: "repaid-1",
        type: "repaid",
        title: "Emergency Restock",
        amount: 10000,
        totalPaid: 10150,
        completed: "2026-03-01",
      },
    ];

    return [liveOffer || defaultOffer, ...base];
  }, [liveOffer, inventoryOffer, activeLoans]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="space-y-4">
        {loans.map((loan) => {
          const isOffer = loan.type === "offer";
          const isActive = loan.type === "active";
          const isRepaid = loan.type === "repaid";

          return (
            <div
              key={loan.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-3">
                  {isOffer ? (
                    <Zap className="w-6 h-6 text-sky-500 mt-0.5" />
                  ) : null}
                  {isActive ? (
                    <Clock className="w-6 h-6 text-amber-500 mt-0.5" />
                  ) : null}
                  {isRepaid ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-0.5" />
                  ) : null}

                  <div>
                    <div className="text-lg font-extrabold text-slate-900">
                      {loan.title}
                    </div>
                    <div className="text-base text-slate-500 capitalize">
                      {loan.type}
                    </div>
                  </div>
                </div>

                <div className="text-2xl font-extrabold text-slate-900">
                  {fmt(loan.amount)}
                </div>
              </div>

              {isOffer ? (
                <div className="mt-4">
                  <p className="text-base text-slate-500">{loan.description}</p>
                  <button
                    onClick={() => setSelectedLoan(loan)}
                    className="mt-4 bg-sky-500 hover:bg-sky-600 text-white px-5 py-3 rounded-xl text-base font-bold flex items-center gap-2"
                  >
                    <Landmark className="w-5 h-5" /> View & Approve
                  </button>
                </div>
              ) : null}

              {isActive ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-base">
                    <span className="text-slate-500">
                      EMI:{" "}
                      <span className="text-slate-900 font-bold">{fmt(loan.emiAmount)}</span>
                    </span>
                    <span className="text-slate-500">
                      Remaining:{" "}
                      <span className="text-slate-900 font-bold">{fmt(loan.remaining)}</span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-sky-500 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (loan.emiPaid / loan.emiTotal) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-base text-slate-500">
                    {loan.emiPaid}/{loan.emiTotal} EMIs paid
                  </div>
                </div>
              ) : null}

              {isRepaid ? (
                <div className="mt-4 text-base text-slate-500 flex flex-wrap gap-x-6 gap-y-2">
                  <div>
                    Total paid:{" "}
                    <span className="text-emerald-600 font-bold">{fmt(loan.totalPaid)}</span>
                  </div>
                  <div>
                    Completed: <span className="text-slate-700">{loan.completed}</span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {selectedLoan ? (
        <LoanCard
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
          onApproved={(loan) => {
            addActiveLoanFromOffer(loan);
          }}
        />
      ) : null}
    </div>
  );
}