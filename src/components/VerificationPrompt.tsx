import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { CivicIssue } from "../types";
import { CheckCircle2, Loader2, Zap, Eye } from "lucide-react";
import { motion } from "motion/react";

interface VerificationPromptProps {
  issue: CivicIssue;
}

export const VerificationPrompt: React.FC<VerificationPromptProps> = ({ issue }) => {
  const { verifyResolution, user } = useApp();
  const [voting, setVoting] = useState<"clean" | "dirty" | null>(null);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || issue.status !== "Pending Verification") return null;

  const hasVotedClean = issue.verificationVotes.clean.includes(user.uid);
  const hasVotedDirty = issue.verificationVotes.dirty.includes(user.uid);
  const hasVoted = hasVotedClean || hasVotedDirty || voted;

  const cleanCount = issue.verificationVotes.clean.length;
  const dirtyCount = issue.verificationVotes.dirty.length;
  const threshold = issue.verificationThreshold;

  const handleVote = async (vote: "clean" | "dirty") => {
    if (hasVoted || voting) return;
    setVoting(vote);
    setError(null);
    try {
      await verifyResolution(issue.id, vote);
      setVoted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vote failed. Try again.");
    } finally {
      setVoting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-2 border-emerald-200 rounded-2xl p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Eye className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
        <div>
          <h4 className="text-xs font-display font-bold text-slate-800">
            Community Verification
          </h4>
          <p className="text-[10px] text-slate-400">
            A cleaner says this is fixed. Does it look resolved to you?
          </p>
        </div>
      </div>

      {/* Before / After photos */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
            Before
          </p>
          {issue.photoUrl ? (
            <img
              src={issue.photoUrl}
              alt="Issue before cleanup"
              className="w-full h-28 object-cover rounded-xl bg-slate-100"
            />
          ) : (
            <div className="w-full h-28 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-300">
              No photo
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider text-center">
            After
          </p>
          {issue.completionPhotoUrl ? (
            <img
              src={issue.completionPhotoUrl}
              alt="Completed cleanup"
              className="w-full h-28 object-cover rounded-xl bg-slate-100"
            />
          ) : (
            <div className="w-full h-28 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-300">
              Pending
            </div>
          )}
        </div>
      </div>

      {/* AI summary */}
      {issue.aiCompletionSummary && (
        <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <Zap className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            {issue.aiCompletionSummary}
          </p>
        </div>
      )}

      {/* Vote tally */}
      <div className="flex gap-3 text-[10px] font-mono text-slate-500">
        <span className="text-emerald-600 font-bold">{cleanCount} clean</span>
        <span>·</span>
        <span className="text-rose-500 font-bold">{dirtyCount} dirty</span>
        <span>·</span>
        <span>need {threshold} to decide</span>
      </div>

      {/* Buttons or voted state */}
      {hasVoted ? (
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-slate-600 font-semibold">
            {hasVotedClean || voted ? "Vote recorded — thanks for keeping the city honest! +10 XP" : "Vote recorded."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleVote("clean")}
            disabled={voting !== null}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            {voting === "clean" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            ✅ It's Clean
          </button>
          <button
            type="button"
            onClick={() => handleVote("dirty")}
            disabled={voting !== null}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            {voting === "dirty" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            🚩 Still Dirty
          </button>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-500">{error}</p>}
    </motion.div>
  );
};
