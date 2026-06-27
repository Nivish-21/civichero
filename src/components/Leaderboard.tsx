import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { UserProfile } from "../types";
import { Trophy, Award, FileText, Loader2 } from "lucide-react";

type LeaderboardTab = "xp" | "reports";

const RANK_EMOJI = ["🥇", "🥈", "🥉"];

const ROLE_BADGE: Record<string, { label: string; style: string }> = {
  admin: { label: "Admin", style: "text-rose-500 bg-rose-500/10 border border-rose-500/20" },
  cleaner: { label: "Cleaner", style: "text-amber-500 bg-amber-500/10 border border-amber-500/20" },
  citizen: { label: "", style: "" },
};

interface UserRowProps {
  rank: number;
  profile: UserProfile;
  valueKey: "xp" | "reportCount";
}

function UserRow({ rank, profile, valueKey }: UserRowProps) {
  const medal = rank <= 3 ? RANK_EMOJI[rank - 1] : null;
  const badge = ROLE_BADGE[profile.role] ?? ROLE_BADGE.citizen;
  const value = valueKey === "xp" ? profile.xp : profile.reportCount;
  const isTop = rank <= 3;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        isTop ? "bg-gradient-to-r from-slate-50 to-transparent" : ""
      }`}
    >
      <div className="w-7 shrink-0 text-center">
        {medal ? (
          <span className="text-lg leading-none">{medal}</span>
        ) : (
          <span className="text-[11px] font-mono text-slate-400">#{rank}</span>
        )}
      </div>

      <img
        src={profile.avatarUrl}
        alt={profile.displayName}
        className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 p-1.5 object-contain shrink-0"
      />

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-xs font-bold text-slate-800 truncate">{profile.displayName}</p>
        {badge.label && (
          <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded ${badge.style}`}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-display font-extrabold text-emerald-600">
          {value.toLocaleString()}
        </p>
        <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">
          {valueKey === "xp" ? "XP" : "reports"}
        </p>
      </div>
    </div>
  );
}

export const Leaderboard: React.FC = () => {
  const { leaderboard, loadingUser } = useApp();
  const [tab, setTab] = useState<LeaderboardTab>("xp");

  const sorted = [...leaderboard].sort((a, b) =>
    tab === "xp" ? b.xp - a.xp : b.reportCount - a.reportCount,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">
            Leaderboard
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Top civic heroes in your district
          </p>
        </div>
        <Trophy className="w-6 h-6 text-amber-400" />
      </div>

      {/* Tab switcher */}
      <div className="flex p-1 bg-slate-100 rounded-xl max-w-xs">
        <button
          type="button"
          onClick={() => setTab("xp")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === "xp"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          XP Leaders
        </button>
        <button
          type="button"
          onClick={() => setTab("reports")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === "reports"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Top Reporters
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loadingUser ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="py-16 text-center text-xs text-slate-400 italic">
            No heroes yet — be the first!
          </p>
        ) : (
          <div className="divide-y divide-slate-50">
            {sorted.map((profile, i) => (
              <React.Fragment key={profile.uid}>
                <UserRow
                  rank={i + 1}
                  profile={profile}
                  valueKey={tab === "xp" ? "xp" : "reportCount"}
                />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
