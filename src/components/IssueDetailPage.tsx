import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { CivicIssue, IssueStatus } from "../types";
import { CivicMap } from "./CivicMap";
import { CleanerPanel } from "./CleanerPanel";
import { VerificationPrompt } from "./VerificationPrompt";
import {
  ArrowLeft,
  MapPin,
  ThumbsUp,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Shield,
  Loader2,
  Film,
  Activity,
  MessageSquare,
  Building2,
  Gauge,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import {
  getRelativeTime,
  getCategoryBadgeColors,
  getStatusBadgeColors,
} from "./CommunityFeed";
import { motion } from "motion/react";

interface IssueDetailPageProps {
  issue: CivicIssue;
  onBack: () => void;
}

export const IssueDetailPage: React.FC<IssueDetailPageProps> = ({
  issue: initialIssue,
  onBack,
}) => {
  const { upvoteIssue, updateIssueStatus, resolveIssuePlan, user, issues } =
    useApp();

  // Re-derive the live issue from context so Firestore updates (e.g. a freshly
  // generated agent plan) are reflected — the selected issue prop is a snapshot.
  const issue = issues.find((i) => i.id === initialIssue.id) ?? initialIssue;

  // Simulated status update state
  const [showAuthorityConsole, setShowAuthorityConsole] = useState(false);
  const [targetStatus, setTargetStatus] = useState<IssueStatus>("Acknowledged");
  const [authorityNote, setAuthorityNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Agentic Resolution Layer state
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const plan = issue.agentPlan;

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    setPlanError(null);
    try {
      await resolveIssuePlan(issue.id);
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : "Failed to generate plan",
      );
    } finally {
      setGeneratingPlan(false);
    }
  };

  const copyDraft = async () => {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(plan.draftReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — non-critical
    }
  };

  // Priority badge colour bucket (static classes for Tailwind).
  const priorityTone =
    plan && plan.priorityScore >= 75
      ? {
          box: "bg-rose-50 border-rose-100",
          text: "text-rose-600",
          bar: "bg-rose-500",
        }
      : plan && plan.priorityScore >= 50
        ? {
            box: "bg-amber-50 border-amber-100",
            text: "text-amber-600",
            bar: "bg-amber-500",
          }
        : {
            box: "bg-emerald-50 border-emerald-100",
            text: "text-emerald-600",
            bar: "bg-emerald-500",
          };

  const hasUpvoted = user && issue.upvotedByUserIds.includes(user.uid);

  // Core status levels helper
  const statusLevels: {
    status: IssueStatus;
    label: string;
    description: string;
  }[] = [
    {
      status: "Reported",
      label: "Reported",
      description: "AI triaged & cataloged.",
    },
    {
      status: "Acknowledged",
      label: "Acknowledged",
      description: "3+ upvotes or admin review.",
    },
    {
      status: "Claimed",
      label: "Claimed",
      description: "A cleaner has taken ownership.",
    },
    {
      status: "Pending Verification",
      label: "Pending Verification",
      description: "Proof submitted — awaiting community votes.",
    },
    {
      status: "Resolved",
      label: "Resolved",
      description: "Community verified — hazard removed!",
    },
  ];

  // Map every status to a stepper index (In Progress is a legacy admin alias for Claimed level)
  const statusIndexMap: Record<IssueStatus, number> = {
    Reported: 0,
    Acknowledged: 1,
    "In Progress": 2,
    Claimed: 2,
    "Pending Verification": 3,
    Resolved: 4,
  };
  const currentStatusIndex = statusIndexMap[issue.status] ?? 0;

  // Handle simulated status change
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorityNote.trim()) return;

    setUpdating(true);
    try {
      await updateIssueStatus(issue.id, targetStatus, authorityNote);
      setAuthorityNote("");
      setShowAuthorityConsole(false);
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Detail view header bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase border ${getCategoryBadgeColors(issue.category)}`}
          >
            {issue.category}
          </span>
          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md shadow-sm ${getStatusBadgeColors(issue.status)}`}
          >
            {issue.status}
          </span>
        </div>
      </div>

      {/* Grid Layout of Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Media & Core Information */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Photo Card */}
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="relative bg-slate-900 max-h-[380px] overflow-hidden flex items-center justify-center">
              {issue.photoUrl ? (
                <img
                  src={issue.photoUrl}
                  alt={issue.category}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto max-h-[380px] object-cover"
                />
              ) : (
                <div className="py-24 text-slate-600 text-center space-y-2">
                  <FileText className="w-12 h-12 mx-auto" />
                  <p className="text-xs">No media attachment found.</p>
                </div>
              )}

              {/* Severity absolute tag */}
              <div className="absolute top-4 left-4">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-lg border shadow-md text-white ${
                    issue.severity === "High"
                      ? "bg-rose-600 border-rose-500"
                      : issue.severity === "Medium"
                        ? "bg-amber-600 border-amber-500"
                        : "bg-emerald-600 border-emerald-500"
                  }`}
                >
                  {issue.severity} Hazard Severity
                </span>
              </div>
            </div>

            {/* Optional video clip preview */}
            {issue.videoUrl && (
              <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                <h4 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-emerald-500" />
                  <span>Citizen Video Clip Context</span>
                </h4>
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-950">
                  <video
                    src={issue.videoUrl}
                    controls
                    className="w-full max-h-[220px] object-contain mx-auto"
                  />
                </div>
              </div>
            )}

            {/* Core textual info */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Reported {getRelativeTime(issue.timestamp)}</span>
                  <span className="mx-1">•</span>
                  <span>ID: {issue.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <h1 className="text-xl font-display font-extrabold text-slate-900 leading-tight">
                  {issue.summary}
                </h1>
              </div>

              {/* User Note Box */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Additional Citizen Note</span>
                </h4>
                <p className="text-xs text-slate-700 italic leading-relaxed font-sans">
                  "
                  {issue.userNote ||
                    "The reporting citizen did not supply secondary notes."}
                  "
                </p>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => upvoteIssue(issue.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    hasUpvoted
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <ThumbsUp
                    className={`w-4 h-4 ${hasUpvoted ? "fill-current" : ""}`}
                  />
                  <span>
                    {issue.upvotes}{" "}
                    {hasUpvoted
                      ? "Upvotes registered"
                      : "Verify (I see this too)"}
                  </span>
                </button>

                {/* Admin-only authority console trigger */}
                {user?.role === "admin" && (
                  <button
                    type="button"
                    onClick={() => setShowAuthorityConsole(!showAuthorityConsole)}
                    className={`flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      showAuthorityConsole
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                    }`}
                  >
                    <Shield className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>Admin Override</span>
                  </button>
                )}
              </div>

              {/* Cleaner action panel */}
              {user?.role === "cleaner" && <CleanerPanel issue={issue} />}

              {/* Citizen verification prompt for Pending Verification issues */}
              {user?.role === "citizen" && (
                <VerificationPrompt issue={issue} />
              )}
            </div>
          </div>

          {/* SIMULATED AUTHORITY CONSOLE PANEL */}
          {showAuthorityConsole && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 p-5 shadow-lg space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
                <Shield className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider">
                    District Authority Console
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Simulate updates from public works personnel
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      New Progress Status
                    </label>
                    <select
                      value={targetStatus}
                      onChange={(e) =>
                        setTargetStatus(e.target.value as IssueStatus)
                      }
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                    >
                      <option value="Acknowledged">
                        Acknowledged (Reviewing)
                      </option>
                      <option value="In Progress">
                        In Progress (Dispatched)
                      </option>
                      <option value="Resolved">Resolved (Complete)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Authority Worklog Update Note{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={authorityNote}
                    onChange={(e) => setAuthorityNote(e.target.value)}
                    required
                    placeholder="Provide details of the dispatch or work complete (e.g., 'Workcrew dispatched with cold-patch asphalt' or 'Pothole filled and sealed successfully')"
                    className="w-full text-xs border border-slate-200 bg-slate-50 rounded-xl p-3 focus:outline-emerald-500"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAuthorityConsole(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating || !authorityNote.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <span>Post Worklog Update</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Map Location Section */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4.5 h-4.5 text-emerald-500" />
              <span>Location Mapping</span>
            </h3>
            <CivicMap
              interactive={false}
              selectedIssueId={issue.id}
              heightClass="h-[220px]"
            />
          </div>
        </div>

        {/* Right Column: Status Timeline Tracking */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI ACTION PLAN — Agentic Resolution Layer */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-white shrink-0" />
                <div>
                  <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider leading-none">
                    AI Action Plan
                  </h3>
                  <p className="text-[10px] text-emerald-50/80 mt-0.5">
                    Autonomous Gemini resolution agent
                  </p>
                </div>
              </div>
              {plan && (
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={generatingPlan}
                  title="Regenerate plan"
                  className="text-white/80 hover:text-white disabled:opacity-50 transition-colors"
                >
                  {generatingPlan ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            <div className="p-5">
              {/* Empty state */}
              {!plan && !generatingPlan && (
                <div className="text-center space-y-3 py-2">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Route this issue to the right authority, detect duplicates,
                    score priority, and draft a formal complaint —
                    automatically.
                  </p>
                  <button
                    type="button"
                    onClick={handleGeneratePlan}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-950 text-white hover:bg-slate-800 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Generate AI Action Plan</span>
                  </button>
                  {planError && (
                    <p className="text-[11px] text-rose-500">{planError}</p>
                  )}
                </div>
              )}

              {/* Loading state */}
              {generatingPlan && !plan && (
                <div className="py-6 flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <p className="text-xs">Agent planning resolution…</p>
                </div>
              )}

              {/* Plan */}
              {plan && (
                <div className="space-y-4">
                  {/* Routed authority */}
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-4.5 h-4.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Routed to
                      </p>
                      <p className="text-xs font-bold text-slate-800 leading-snug">
                        {plan.authority}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {plan.authorityReason}
                      </p>
                    </div>
                  </div>

                  {/* Priority + SLA */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`p-3 rounded-2xl border ${priorityTone.box}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Priority
                        </span>
                        <Gauge className={`w-3.5 h-3.5 ${priorityTone.text}`} />
                      </div>
                      <p
                        className={`text-lg font-display font-extrabold ${priorityTone.text} leading-none mt-1`}
                      >
                        {plan.priorityScore}
                        <span className="text-[10px] font-bold text-slate-400">
                          /100
                        </span>
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-white/70 overflow-hidden">
                        <div
                          className={`h-full ${priorityTone.bar}`}
                          style={{ width: `${plan.priorityScore}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Target SLA
                        </span>
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <p className="text-lg font-display font-extrabold text-slate-800 leading-none mt-1">
                        {plan.slaDays}
                        <span className="text-[10px] font-bold text-slate-400">
                          {" "}
                          days
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Duplicate detection */}
                  {plan.duplicateOfId ? (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 flex gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-amber-700">
                          Possible duplicate · #
                          {plan.duplicateOfId.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[10px] text-amber-600/90 mt-0.5">
                          {plan.duplicateReason}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-[11px] text-slate-500">
                        No duplicate reports found nearby.
                      </p>
                    </div>
                  )}

                  {/* Recommended actions */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Recommended actions
                    </p>
                    <ul className="space-y-1.5">
                      {plan.recommendedActions.map((action, i) => (
                        <li key={i} className="flex gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-600 leading-snug">
                            {action}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Draft complaint */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Draft complaint
                      </p>
                      <button
                        type="button"
                        onClick={copyDraft}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <pre className="text-[10px] whitespace-pre-wrap font-mono bg-slate-950 text-slate-200 p-3 rounded-xl max-h-44 overflow-auto leading-relaxed">
                      {plan.draftReport}
                    </pre>
                  </div>

                  {plan.isSimulated && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Demo mode — add a Gemini key for live agent output.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timeline Tracking Progression Card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
            <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
              <Activity className="w-4.5 h-4.5 text-emerald-500" />
              <span>Resolution Timeline</span>
            </h3>

            {/* Visual Timeline Stepper */}
            <div className="relative pl-6 space-y-6">
              {/* Connective Line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-100" />

              {statusLevels.map((lvl, index) => {
                const isPassed = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;

                return (
                  <div key={lvl.status} className="relative flex gap-3.5">
                    {/* Node Circle */}
                    <div
                      className={`absolute -left-[23px] top-1 w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center z-10 transition-colors duration-300 ${
                        isPassed
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-white border-slate-200 text-slate-300"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-3 h-3 fill-current text-white stroke-[3]" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-xs font-bold leading-none ${isCurrent ? "text-emerald-600 font-extrabold" : isPassed ? "text-slate-800" : "text-slate-400"}`}
                      >
                        {lvl.label}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {lvl.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Worklog updates history list */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
              <MessageSquare className="w-4.5 h-4.5 text-emerald-500" />
              <span>Official Worklog Updates</span>
            </h3>

            {issue.history && issue.history.length > 0 ? (
              <div className="space-y-4">
                {issue.history
                  .slice()
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((event, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border ${
                        event.status === "Resolved"
                          ? "bg-emerald-50/50 border-emerald-100"
                          : event.status === "In Progress"
                            ? "bg-indigo-50/50 border-indigo-100"
                            : "bg-slate-50/70 border-slate-100"
                      } space-y-2`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${getStatusBadgeColors(event.status)}`}
                        >
                          {event.status}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {getRelativeTime(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-sans">
                        {event.notes}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4 italic">
                No logs published yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
