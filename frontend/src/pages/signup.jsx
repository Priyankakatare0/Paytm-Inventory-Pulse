import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, User, Mail, Phone, Lock } from "lucide-react";

import { register as registerApi, getApiErrorMessage } from "../lib/api.js";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        phone,
        ...(pin ? { pin } : {}),
      };

      const data = await registerApi(payload);
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
    <>
      <style>{`html, body { background-color: #041538 !important; }`}</style>
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-[#061d4a] via-[#061d4a] to-[#041538]">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/15 flex items-center justify-center border border-sky-400/20">
              <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" />
              </div>
            </div>

            <h1 className="mt-6 text-3xl font-extrabold text-white">InventoryPulse</h1>
            <p className="mt-2 text-sky-400 text-md">Powered by Udhaar AI</p>
          </div>

          {/* Card */}
          <div className="w-full bg-white rounded-2xl shadow-2xl px-8 py-4">
            <form onSubmit={handleSignup} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-slate-800 font-semibold mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-800 font-semibold mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-slate-800 font-semibold mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* PIN (optional) */}
              <div>
                <label className="block text-slate-800 font-semibold mb-1">PIN</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    placeholder="4-digit PIN"
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  If you leave this empty, backend sets default PIN to <span className="font-semibold">1234</span>.
                </p>
              </div>

              {error && <div className="text-sm text-red-600 font-medium">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>

              <p className="text-center text-slate-600 text-md">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                >
                  Login here
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

