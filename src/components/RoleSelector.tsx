import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Wrench, CheckCircle2, Loader2 } from "lucide-react";

export const RoleSelector: React.FC = () => {
  const { user, upgradeToCleanerRole } = useApp();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.role !== "citizen") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await upgradeToCleanerRole(trimmed);
      if (ok) {
        setSuccess(true);
      } else {
        setError("Invalid cleaner code. Check with your district coordinator.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-xs font-bold text-emerald-800">You're now a Cleaner! 🧹</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">
            Claim and resolve issues to earn XP and achievements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-slate-800">Join as a Cleaner</h4>
          <p className="text-[10px] text-slate-400">
            Enter your district cleaner code to unlock cleanup missions
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter cleaner code…"
          className="flex-1 min-w-0 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {loading ? "Verifying…" : "Join"}
        </button>
      </form>

      {error && (
        <p className="text-[11px] text-rose-500 leading-relaxed">{error}</p>
      )}
    </div>
  );
};
