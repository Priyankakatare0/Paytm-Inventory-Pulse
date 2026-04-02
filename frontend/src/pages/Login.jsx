import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Phone, Lock } from "lucide-react";

import { login as loginApi, getApiErrorMessage } from "../lib/api.js";

const DEMO_PHONE = "9876543210";
const DEMO_PIN = "1234";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginApi(phone, pin);
      const { token, merchant } = data || {};

      if (!token) throw new Error("No token received from server");

      localStorage.setItem("ip_token", token);
      if (merchant) localStorage.setItem("ip_merchant", JSON.stringify(merchant));

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#061d4a] via-[#061d4a] to-[#041538]">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/15 flex items-center justify-center border border-sky-400/20">
            <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-white">
            InventoryPulse
          </h1>
          <p className="mt-2 text-sky-400 text-md">Powered by Udhaar AI</p>
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-2xl shadow-2xl px-8 py-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Phone */}
            <div>
              <label className="block text-slate-800 font-semibold mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  maxLength={10}
                  placeholder={phone ? "" : "Enter 10-digit number"}
                  className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* PIN */}
            <div>
              <label className="block text-slate-800 font-semibold mb-2">
                PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength={6}
                  placeholder={pin ? "" : "4-digit PIN"}
                  className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 font-medium">{error}</div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            {/* Demo */}
            <p className="text-center text-slate-500 text-sm">
              Demo:{" "}
              <span className="font-semibold text-slate-700">
                {DEMO_PHONE}
              </span>{" "}
              /{" "}
              <span className="font-semibold text-slate-700">{DEMO_PIN}</span>
            </p>

            {/* Signup link */}
            <p className="text-center text-slate-600 text-md">
              Not already registered?{" "}
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="font-semibold text-sky-600 hover:text-sky-700 hover:underline"
              >
                Signup here
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}