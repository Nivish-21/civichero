import React, { useRef, useState } from "react";
import { useApp, VerifyResult } from "../context/AppContext";
import { CivicIssue } from "../types";
import { Camera, CheckCircle2, Loader2, AlertTriangle, Zap } from "lucide-react";
import { motion } from "motion/react";

interface CleanerPanelProps {
  issue: CivicIssue;
}

export const CleanerPanel: React.FC<CleanerPanelProps> = ({ issue }) => {
  const { user, claimIssue, submitCompletionPhoto } = useApp();
  const [claiming, setClaiming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user || user.role !== "cleaner") return null;

  const isMyClaim = issue.claimedByUid === user.uid;
  const isClaimedByOther =
    !!issue.claimedByUid && issue.claimedByUid !== user.uid;

  const handleClaim = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      await claimIssue(issue.id);
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : "Failed to claim issue");
    } finally {
      setClaiming(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setVerifyResult(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string | undefined;
      if (!base64) {
        setUploadError("Failed to read image");
        setUploading(false);
        return;
      }
      try {
        const result = await submitCompletionPhoto(issue.id, base64);
        setVerifyResult(result);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Failed to submit photo",
        );
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError("Could not read image file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected if needed
    e.target.value = "";
  };

  // Pending Verification — this cleaner already submitted proof
  if (issue.status === "Pending Verification" && isMyClaim) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-emerald-800">
            Proof submitted — awaiting citizen votes
          </span>
        </div>
        {issue.aiCompletionSummary && (
          <p className="text-[10px] text-emerald-700 leading-relaxed">
            {issue.aiCompletionSummary}
          </p>
        )}
        <div className="flex gap-3 text-[10px] text-emerald-600 font-mono">
          <span>✅ {issue.verificationVotes.clean.length} clean</span>
          <span>·</span>
          <span>🚩 {issue.verificationVotes.dirty.length} dirty</span>
          <span>·</span>
          <span>need {issue.verificationThreshold}</span>
        </div>
      </div>
    );
  }

  // Claimed by me — upload proof
  if (issue.status === "Claimed" && isMyClaim) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Camera className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              Upload Completion Proof
            </h4>
            <p className="text-[10px] text-slate-400">
              Photograph the cleaned area — Gemini will verify it.
            </p>
          </div>
        </div>

        {verifyResult ? (
          <div
            className={`p-3 rounded-xl border ${
              verifyResult.isResolved
                ? "bg-emerald-50 border-emerald-200"
                : "bg-rose-50 border-rose-200"
            }`}
          >
            <p
              className={`text-xs font-bold ${
                verifyResult.isResolved ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {verifyResult.isResolved
                ? "✅ AI verified — looks resolved!"
                : "❌ AI flagged — area may need more work"}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              {verifyResult.summary}
            </p>
            {verifyResult.isSimulated && (
              <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5" /> Demo mode — no Gemini key
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            <span>{uploading ? "Uploading & verifying…" : "Take / Upload Photo"}</span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadError && (
          <p className="text-[11px] text-rose-500">{uploadError}</p>
        )}
      </motion.div>
    );
  }

  // Acknowledged and unclaimed — show claim button
  if (issue.status === "Acknowledged" && !issue.claimedByUid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
      >
        <p className="text-[10px] text-slate-400 leading-relaxed">
          This issue needs a cleaner. Claim it to earn XP when you resolve it.
        </p>
        <button
          type="button"
          onClick={handleClaim}
          disabled={claiming}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
        >
          {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          <span>{claiming ? "Claiming…" : "🙋 Claim This Issue (+10 XP)"}</span>
        </button>
        {claimError && (
          <p className="text-[11px] text-rose-500">{claimError}</p>
        )}
      </motion.div>
    );
  }

  // Claimed by someone else
  if (isClaimedByOther) {
    return (
      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <p className="text-[10px] text-slate-400">
          Already claimed by another cleaner.
        </p>
      </div>
    );
  }

  return null;
};
