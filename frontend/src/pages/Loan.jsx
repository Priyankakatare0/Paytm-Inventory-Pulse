import { useMemo, useState } from "react";
import { Zap, CheckCircle2, Clock, Landmark } from "lucide-react";
import LoanCard from "../components/LoanCard";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function Loan() {
  const [selectedLoan, setSelectedLoan] = useState(null);

  const loans = useMemo(
    () => [
      {
        id: "offer-1",
        type: "offer",
        title: "Restock Loan",
        amount: 25000,
        interest: 1.5,
        tenure: "3 months",
        description:
          "AI detected: 7 items below threshold. Restock now with easy EMI.",
        aiReason:
          "Based on your 6-month sales pattern, restocking Atta, Dal, and Dairy will increase weekly revenue by ~₹4,200.",
        steps: [
          "AI analyzes your inventory & sales",
          "Instant approval based on store history",
          "Amount credited to your account",
          "Auto-deduct EMI from daily sales",
        ],
        emiTotal: 6,
        emiAmount: 4500,
      },
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
    ],
    []
  );

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
        <LoanCard loan={selectedLoan} onClose={() => setSelectedLoan(null)} />
      ) : null}
    </div>
  );
}